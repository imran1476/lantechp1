import type { Express, NextFunction, Request, Response } from 'express';
import { requireAuth, attachUser, type PublicUser } from './auth';
import { RecordStore, StoreError } from './store';

const asActor = (req: Request) => (req as Request & { auth?: { user: PublicUser } | null }).auth!.user;
const ID_RE = /^[a-zA-Z0-9_-]{3,64}$/;

function wrap(fn: (req: Request, res: Response) => void) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      fn(req, res);
    } catch (e) {
      if (e instanceof StoreError) {
        return res.status(e.status).json({ success: false, error: e.code, message: e.message, ...(e.extra ?? {}) });
      }
      console.error('records error:', e);
      next(e);
    }
  };
}

export function registerRecordRoutes(app: Express, store: RecordStore) {
  // লগইন ছাড়া অনুরোধের বডি পার্স করার আগেই আটকানো হয়
  app.use('/api/records', attachUser, requireAuth());

  app.get('/api/records', wrap((_req, res) => {
    res.json({ success: true, records: store.list() });
  }));

  app.post('/api/records', requireAuth(['operator', 'admin']), wrap((req, res) => {
    const { record, imageBase64, mimeType } = req.body ?? {};
    if (!record || typeof record !== 'object') throw new StoreError(400, 'bad_record', 'রেকর্ডের তথ্য পাওয়া যায়নি।');
    let image: { data: Buffer; mime: string } | undefined;
    if (typeof imageBase64 === 'string' && imageBase64) {
      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(mimeType)) throw new StoreError(400, 'bad_file', 'শুধু JPG, PNG বা PDF গ্রহণযোগ্য।');
      const data = Buffer.from(imageBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      if (data.length === 0 || data.length > 10 * 1024 * 1024) throw new StoreError(413, 'too_large', 'ফাইল ১০ MB-এর বেশি হতে পারবে না।');
      image = { data, mime: mimeType };
    }
    res.status(201).json({ success: true, record: store.create(record, asActor(req), image) });
  }));

  app.put('/api/records/:id', wrap((req, res) => {
    if (!ID_RE.test(req.params.id)) throw new StoreError(400, 'bad_id', 'ভুল আইডি।');
    const { patch, confirmFields } = req.body ?? {};
    if (!patch || typeof patch !== 'object') throw new StoreError(400, 'bad_patch', 'সংশোধনের তথ্য পাওয়া যায়নি।');
    res.json({ success: true, record: store.update(req.params.id, patch, Array.isArray(confirmFields) ? confirmFields.map(String) : undefined, asActor(req)) });
  }));

  app.post('/api/records/:id/approve', requireAuth(['reviewer', 'admin']), wrap((req, res) => {
    if (!ID_RE.test(req.params.id)) throw new StoreError(400, 'bad_id', 'ভুল আইডি।');
    res.json({ success: true, record: store.approve(req.params.id, asActor(req)) });
  }));

  app.post('/api/records/:id/reject', requireAuth(['reviewer', 'admin']), wrap((req, res) => {
    if (!ID_RE.test(req.params.id)) throw new StoreError(400, 'bad_id', 'ভুল আইডি।');
    res.json({ success: true, record: store.reject(req.params.id, req.body?.reason, asActor(req)) });
  }));

  app.get('/api/records/:id/verify', wrap((req, res) => {
    if (!ID_RE.test(req.params.id)) throw new StoreError(400, 'bad_id', 'ভুল আইডি।');
    res.json({ success: true, result: store.verify(req.params.id) });
  }));

  app.get('/api/records/:id/image', wrap((req, res) => {
    if (!ID_RE.test(req.params.id)) throw new StoreError(400, 'bad_id', 'ভুল আইডি।');
    const img = store.imagePath(req.params.id);
    if (!img) throw new StoreError(404, 'no_image', 'এই রেকর্ডের কোনো ছবি নেই।');
    res.setHeader('Content-Type', img.mime);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(img.file);
  }));
}
