import React, { useState, useEffect } from "react";
import { pharmacyStorage } from "../services/pharmacyStorage";
import { Pharmacy } from "../types";
import { Building, Check, X, AlertTriangle, RefreshCw, Eye } from "lucide-react";

export default function PharmacyVerificationPanel() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("All");

  useEffect(() => {
    fetch("/api/admin/pharmacies")
      .then(res => res.json())
      .then(data => setPharmacies(data.pharmacies || []));
  }, []);

  const handleAction = async (id: string, action: string) => {
    await fetch(`/api/admin/pharmacies/${id}/${action}`, { method: "POST" });
    // Refresh list
    const res = await fetch("/api/admin/pharmacies");
    const data = await res.json();
    setPharmacies(data.pharmacies || []);
  };

  const viewDocument = async (path: string) => {
    const url = await pharmacyStorage.getSignedDocumentUrl(path);
    window.open(url, "_blank");
  };

  const filtered = pharmacies.filter(p => filterStatus === "All" || p.verificationStatus === filterStatus);
  const stats = {
    Pending: pharmacies.filter(p => p.verificationStatus === "Pending").length,
    Approved: pharmacies.filter(p => p.verificationStatus === "Approved").length,
    Rejected: pharmacies.filter(p => p.verificationStatus === "Rejected").length,
    Suspended: pharmacies.filter(p => p.verificationStatus === "Suspended").length,
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      <h2 className="text-2xl font-bold mb-6">Pharmacy Verification Center</h2>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[ { label: "Pending", val: stats.Pending, color: "bg-amber-600" },
           { label: "Approved", val: stats.Approved, color: "bg-emerald-600" },
           { label: "Rejected", val: stats.Rejected, color: "bg-rose-600" },
           { label: "Suspended", val: stats.Suspended, color: "bg-slate-600" } ].map(s => (
          <div key={s.label} className={`${s.color} p-4 rounded-lg`}>
            <div className="text-3xl font-bold">{s.val}</div>
            <div className="text-sm opacity-80">{s.label} Applications</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-4">
        <select className="bg-slate-800 p-2 rounded" onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      <table className="w-full bg-slate-800 rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b border-slate-700">
            <th className="p-3">Name</th>
            <th className="p-3">City</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.id} className="border-b border-slate-700">
              <td className="p-3">{p.pharmacyName}</td>
              <td className="p-3">{p.city}</td>
              <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${p.verificationStatus === 'Approved' ? 'bg-emerald-900' : 'bg-slate-700'}`}>{p.verificationStatus}</span></td>
              <td className="p-3 flex gap-2">
                <button onClick={() => viewDocument(p.licenseDocumentUrl || "")} className="p-1 hover:bg-slate-700 rounded"><Eye className="w-4 h-4"/></button>
                <button onClick={() => handleAction(p.id, "approve")} className="p-1 hover:bg-emerald-900 rounded text-emerald-400"><Check className="w-4 h-4"/></button>
                <button onClick={() => handleAction(p.id, "reject")} className="p-1 hover:bg-rose-900 rounded text-rose-400"><X className="w-4 h-4"/></button>
                <button onClick={() => handleAction(p.id, "request-update")} className="p-1 hover:bg-amber-900 rounded text-amber-400"><RefreshCw className="w-4 h-4"/></button>
                <button onClick={() => handleAction(p.id, "suspend")} className="p-1 hover:bg-slate-700 rounded"><AlertTriangle className="w-4 h-4"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}