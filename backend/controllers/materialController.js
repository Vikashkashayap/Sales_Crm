import fs from 'fs';
import DailyMaterial from '../models/DailyMaterial.js';
import { materialDiskPath, materialPublicUrl } from '../utils/materialUpload.js';
import { parseSendDate } from '../utils/dateHelpers.js';

function formatMaterial(doc) {
  const row = doc.toObject ? doc.toObject() : doc;
  return {
    ...row,
    id: row._id,
  };
}

export const createMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    const title = String(req.body.title || '').trim();
    if (!title) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Title is required' });
    }

    const sendDate = parseSendDate(req.body.sendDate);
    if (!sendDate) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Valid send date is required' });
    }

    const status = req.body.status === 'inactive' ? 'inactive' : 'active';
    const pdfUrl = materialPublicUrl(req.file.filename);

    const material = await DailyMaterial.create({
      title,
      description: String(req.body.description || '').trim(),
      pdfUrl,
      sendDate,
      status,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: 'Daily material created',
      material: formatMaterial(material),
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore cleanup errors */
      }
    }
    res.status(500).json({ message: error.message || 'Failed to create material' });
  }
};

export const listMaterials = async (req, res) => {
  try {
    const materials = await DailyMaterial.find()
      .sort({ sendDate: -1, createdAt: -1 })
      .lean();

    res.json({
      materials: materials.map((m) => ({ ...m, id: m._id })),
      total: materials.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to list materials' });
  }
};

export const updateMaterialStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or inactive' });
    }

    const material = await DailyMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    material.status = status;
    await material.save();

    res.json({
      message: `Material ${status === 'active' ? 'activated' : 'deactivated'}`,
      material: formatMaterial(material),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update material' });
  }
};

export const deleteMaterial = async (req, res) => {
  try {
    const material = await DailyMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const diskPath = materialDiskPath(material.pdfUrl);
    if (diskPath && fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }

    await material.deleteOne();

    res.json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete material' });
  }
};
