import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import Student from '../models/Student.js';
import {
  buildWelcomeKitAttachments,
  getStudentMedium,
  listWelcomeKitDocumentsForMedium,
} from '../utils/welcomeKitAttachments.js';

const canAccessStudent = (user, student) => {
  if (user.role === 'admin') return true;
  const registeredById = student.registeredBy?._id || student.registeredBy;
  const assignedBdaId = student.assignedBda?._id || student.assignedBda;
  return (
    String(registeredById) === String(user._id) ||
    String(assignedBdaId) === String(user._id)
  );
};

export const getStudentWelcomeKitDocuments = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!canAccessStudent(req.user, student)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const medium = getStudentMedium(student);
    const documents = listWelcomeKitDocumentsForMedium(medium);
    const { missing } = buildWelcomeKitAttachments(medium);

    res.json({ medium, documents, missing });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const downloadStudentWelcomeKit = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!canAccessStudent(req.user, student)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const medium = getStudentMedium(student);
    const { attachments, missing } = buildWelcomeKitAttachments(medium);

    if (attachments.length === 0) {
      return res.status(404).json({
        message: 'No welcome kit documents found on server',
        missing,
      });
    }

    const safeName = (student.fullName || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipName = `WelcomeKit-${safeName}-${medium}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('[welcome-kit-zip]', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Could not create zip archive' });
      }
    });

    archive.pipe(res);

    for (const att of attachments) {
      archive.file(att.path, { name: att.filename });
    }

    await archive.finalize();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
};
