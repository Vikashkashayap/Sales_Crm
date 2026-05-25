import React from 'react';
import UploadExcel from '../../components/UploadExcel';

export default function AdminUploadPage() {
  return (
    <div className="app-card">
      <h2 className="section-heading">Upload Leads</h2>
      <UploadExcel />
    </div>
  );
}
