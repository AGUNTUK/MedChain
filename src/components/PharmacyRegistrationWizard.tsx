import React, { useState } from "react";
import { pharmacyStorage } from "../services/pharmacyStorage";

export default function PharmacyRegistrationWizard({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ ownerName: "", email: "", phone: "", pharmacyName: "", address: "", city: "", area: "", licenseNo: "", licenseDocumentUrl: "" });
  const [file, setFile] = useState<File | null>(null);

  const nextStep = () => setStep(step + 1);

  const handleFileUpload = async () => {
    if (file) {
      const url = await pharmacyStorage.uploadLicenseDocument(file, formData.email); // Using email as temp ID
      setFormData({...formData, licenseDocumentUrl: url});
    }
    nextStep();
  };

  return (
    <div className="p-6 bg-white rounded-lg border">
      <h2 className="text-xl font-bold mb-4">Pharmacy Registration (Step {step}/4)</h2>
      
      {step === 1 && (
        <div className="grid gap-4">
          <input className="border p-2 rounded" placeholder="Owner Name" onChange={e => setFormData({...formData, ownerName: e.target.value})} />
          <input className="border p-2 rounded" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} />
          <button onClick={nextStep} className="bg-brand-purple text-white p-2 rounded">Next</button>
        </div>
      )}
      
      {step === 2 && (
        <div className="grid gap-4">
          <input className="border p-2 rounded" placeholder="Pharmacy Name" onChange={e => setFormData({...formData, pharmacyName: e.target.value})} />
          <button onClick={nextStep} className="bg-brand-purple text-white p-2 rounded">Next</button>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4">
          <input className="border p-2 rounded" placeholder="License No" onChange={e => setFormData({...formData, licenseNo: e.target.value})} />
          <input type="file" className="border p-2 rounded" onChange={e => setFile(e.target.files?.[0] || null)} />
          <button onClick={handleFileUpload} className="bg-brand-purple text-white p-2 rounded">Next</button>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4">
          <p>Review and Submit</p>
          <button onClick={() => onSubmit(formData)} className="bg-green-600 text-white p-2 rounded">Submit</button>
        </div>
      )}
    </div>
  );
}
