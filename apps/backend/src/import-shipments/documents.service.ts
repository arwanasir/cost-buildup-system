import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { StorageService } from '@/storage/storage.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly storageService: StorageService,
  ) {}

  async uploadDocument(
    shipmentId: string,
    file: Express.Multer.File,
    documentType: any,
    referenceNumber: string | undefined,
    documentDate: string | undefined,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const shipment = await tx.query.importShipments.findFirst({
        where: eq(schema.importShipments.id, shipmentId),
      });

      if (!shipment) {
        throw new NotFoundException(`Shipment ${shipmentId} not found`);
      }

      // Build key
      const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectKey = `shipments/${shipment.shipmentNumber}/${documentType}/${uuidv4()}-${cleanFileName}`;

      // Upload to storage
      await this.storageService.upload(file.buffer, objectKey, file.mimetype);

      // Insert DB record
      const [doc] = await tx
        .insert(schema.shipmentDocuments)
        .values({
          shipmentId,
          documentType,
          referenceNumber,
          documentDate: documentDate || new Date().toISOString(),
          objectKey,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          uploadedBy: userId,
        })
        .returning();

      const url = await this.storageService.getSignedUrl(objectKey, 900);

      return {
        ...doc,
        url,
      };
    });
  }

  async getDocuments(shipmentId: string) {
    const docs = await this.db.query.shipmentDocuments.findMany({
      where: eq(schema.shipmentDocuments.shipmentId, shipmentId),
    });

    // Add presigned URLs valid for 15 minutes (900 seconds)
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => {
        const url = await this.storageService.getSignedUrl(doc.objectKey, 900);
        return {
          ...doc,
          url,
        };
      }),
    );

    return docsWithUrls;
  }

  async deleteDocument(shipmentId: string, documentId: string) {
    return this.db.transaction(async (tx) => {
      const doc = await tx.query.shipmentDocuments.findFirst({
        where: eq(schema.shipmentDocuments.id, documentId),
      });

      if (!doc || doc.shipmentId !== shipmentId) {
        throw new NotFoundException(
          `Document ${documentId} not found on shipment ${shipmentId}`,
        );
      }

      await tx
        .delete(schema.shipmentDocuments)
        .where(eq(schema.shipmentDocuments.id, documentId));
      await this.storageService.delete(doc.objectKey);

      return { message: 'Document deleted successfully' };
    });
  }

  async getDocumentChecklist(shipmentId: string) {
    const shipment = await this.db.query.importShipments.findFirst({
      where: eq(schema.importShipments.id, shipmentId),
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    // 1. Fetch uploaded documents
    const uploadedDocs = await this.db.query.shipmentDocuments.findMany({
      where: eq(schema.shipmentDocuments.shipmentId, shipmentId),
    });
    const uploadedByType = new Map<string, any[]>();
    for (const doc of uploadedDocs) {
      if (!uploadedByType.has(doc.documentType)) {
        uploadedByType.set(doc.documentType, []);
      }
      uploadedByType.get(doc.documentType)!.push(doc);
    }

    // 2. Determine required documents
    const requiredMap = new Map<string, boolean>();
    if (shipment.lcId) {
      const lcDocs = await this.db.query.lcRequiredDocuments.findMany({
        where: eq(schema.lcRequiredDocuments.lcId, shipment.lcId),
      });
      for (const req of lcDocs) {
        if (req.isRequired) {
          requiredMap.set(req.documentType, true);
        }
      }
    } else {
      // Default non-LC requirement
      requiredMap.set('ci', true);
      requiredMap.set('bl', true);
      requiredMap.set('packing_list', true);
    }

    // 3. Merge into Checklist
    const checklist = [];
    const allTypes = new Set([...requiredMap.keys(), ...uploadedByType.keys()]);

    let totalRequired = 0;
    let totalUploaded = 0;

    for (const docType of allTypes) {
      const isRequired = requiredMap.has(docType);
      const uploadedFiles = uploadedByType.get(docType) || [];
      const isUploaded = uploadedFiles.length > 0;

      if (isRequired) totalRequired++;
      if (isRequired && isUploaded) totalUploaded++;

      checklist.push({
        documentType: docType,
        isRequired,
        isUploaded,
        isPending: isRequired && !isUploaded,
        uploadedFiles: await Promise.all(
          uploadedFiles.map(async (doc) => ({
            ...doc,
            url: await this.storageService.getSignedUrl(doc.objectKey, 900),
          })),
        ),
      });
    }

    return {
      shipmentId,
      lcId: shipment.lcId,
      summary: {
        totalRequired,
        totalUploaded,
        allRequiredUploaded:
          totalRequired > 0 && totalRequired === totalUploaded,
      },
      checklist,
    };
  }
}
