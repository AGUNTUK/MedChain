const fs = require('fs');

let adminPanel = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

adminPanel = adminPanel.replace(/import\s*\{\s*AreaChart,[\s\S]*?Legend\s*\}\s*from\s*"recharts";/, '');
adminPanel = adminPanel.replace(
  'import React, { useState, useEffect, useMemo } from "react";',
  'import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";\nconst AdminCharts = lazy(() => import("./AdminCharts"));'
);

const oldBlock = `                    <div className="space-y-6 animate-fade-in">
                      {/* B2B Analytics Dashboard */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Revenue Over Time Chart */}
                        <div className="lg:col-span-2 bg-white/60 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Historical Sales Revenue Stream</span>
                            <h3 className="text-sm font-black text-slate-900 mt-1">B2B Sales Trends (BDT ৳)</h3>
                          </div>
                          <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analyticsData?.revenueOverTime || [
                                { date: "07/10", amount: 154000 },
                                { date: "07/11", amount: 320000 },
                                { date: "07/12", amount: 284000 },
                                { date: "07/13", amount: 489000 },
                                { date: "07/14", amount: 531000 }
                              ]}>
                                <defs>
                                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "12px", fontSize: "11px" }}
                                  labelClassName="text-slate-500 font-bold"
                                />
                                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Order status allocation */}
                        <div className="lg:col-span-1 bg-white/60 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1">Status Allocation</span>
                            <h3 className="text-sm font-black text-slate-900">Pipeline Distribution</h3>
                          </div>
                          <div className="h-[220px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analyticsData?.orderStatusDistribution || [
                                    { name: "Pending", value: ordersPending },
                                    { name: "Processing", value: ordersProcessing },
                                    { name: "Completed", value: ordersCompleted },
                                    { name: "Cancelled", value: ordersCancelled }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={75}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  <Cell key="pie-cell-0" fill="#f59e0b" />
                                  <Cell key="pie-cell-1" fill="#6366f1" />
                                  <Cell key="pie-cell-2" fill="#10b981" />
                                  <Cell key="pie-cell-3" fill="#f43f5e" />
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "10px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold border-t border-slate-900 pt-3">
                            <div className="flex items-center gap-1.5 text-amber-400">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending: {ordersPending}
                            </div>
                            <div className="flex items-center gap-1.5 text-indigo-400">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Processing: {ordersProcessing}
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed: {ordersCompleted}
                            </div>
                            <div className="flex items-center gap-1.5 text-rose-400">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Cancelled: {ordersCancelled}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stock reserves by pharmaceutical company */}
                      <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-lg">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Manufacturer Reserves Radar</span>
                          <h3 className="text-sm font-black text-slate-900">Stock Allocation by Pharmaceutical Manufacturer</h3>
                        </div>
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData?.companyStockAllocation || [
                              { name: "Square", stock: 15400 },
                              { name: "Incepta", stock: 12800 },
                              { name: "Beximco", stock: 9400 },
                              { name: "Opsonin", stock: 6700 },
                              { name: "Renata", stock: 4500 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "11px" }}
                                cursor={{ fill: "#1e293b", opacity: 0.2 }}
                              />
                              <Bar dataKey="stock" fill="#10b981" radius={[4, 4, 0, 0]}>
                                <Cell key="bar-cell-0" fill="#10b981" />
                                <Cell key="bar-cell-1" fill="#06b6d4" />
                                <Cell key="bar-cell-2" fill="#6366f1" />
                                <Cell key="bar-cell-3" fill="#3b82f6" />
                                <Cell key="bar-cell-4" fill="#f59e0b" />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>`;

const newBlock = `                    <Suspense fallback={<div className="h-48 w-full flex items-center justify-center text-slate-500 font-bold text-xs bg-white/60 rounded-2xl animate-pulse border border-slate-200">Loading charts...</div>}>
                      <AdminCharts analyticsData={analyticsData} ordersPending={ordersPending} ordersProcessing={ordersProcessing} ordersCompleted={ordersCompleted} ordersCancelled={ordersCancelled} />
                    </Suspense>`;

if (adminPanel.indexOf(oldBlock) === -1) {
  console.log("Could not find block to replace!");
} else {
  adminPanel = adminPanel.replace(oldBlock, newBlock);
  fs.writeFileSync('src/components/AdminPanel.tsx', adminPanel);
  console.log('Replaced charts block!');
}

