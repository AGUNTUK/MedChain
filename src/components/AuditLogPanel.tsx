import React, { useState, useEffect } from "react";
import { auditService } from "../services/auditService";
import { AuditLog } from "../types";

export default function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    auditService.getLogs().then(setLogs);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Operational Audit Logs</h2>
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">User Role</th>
                <th className="p-2 text-left">Module</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b">
                  <td className="p-2">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-2">{log.user_role}</td>
                  <td className="p-2">{log.module}</td>
                  <td className="p-2">{log.action}</td>
                  <td className="p-2">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
