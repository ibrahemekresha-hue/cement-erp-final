'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('custody');

  // بيانات العهدة المفتوحة الحالية
  const [custodyFund, setCustodyFund] = useState({
    amount: 50000,
    currency: 'LYD',
    recipient: 'أحمد الصالحي',
    custodyNo: 'CUS-2026-001'
  });

  const [invoices, setInvoices] = useState([]);
  const [custodyHistory, setCustodyHistory] = useState([]);
  const [showFundModal, setShowFundModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // نموذج الفاتورة الجدیدة
  const [formData, setFormData] = useState({
    id: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    vendor: '',
    description: '',
    amount: '',
    category: 'مواد بناء وتجهيزات',
    attachmentName: '',
    attachmentData: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  // بيانات المرتبات
  const [payrollData, setPayrollData] = useState({ employees: [] });
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', type: 'CWIP - أصول قيد التنفيذ', baseSalary: '', allowance: '' });

  // استرجاع البيانات المجهزة محلياً
  useEffect(() => {
    const savedFund = localStorage.getItem('cement_erp_custody_fund_data');
    if (savedFund) { try { setCustodyFund(JSON.parse(savedFund)); } catch (e) {} }

    const savedInvoices = localStorage.getItem('cement_erp_custody_invoices');
    if (savedInvoices) { try { setInvoices(JSON.parse(savedInvoices)); } catch (e) {} }

    const savedHistory = localStorage.getItem('cement_erp_custody_history');
    if (savedHistory) { try { setCustodyHistory(JSON.parse(savedHistory)); } catch (e) {} }

    setIsLoaded(true);
  }, []);

  // حفظ التغيرات تلقائياً
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cement_erp_custody_fund_data', JSON.stringify(custodyFund));
      localStorage.setItem('cement_erp_custody_invoices', JSON.stringify(invoices));
      localStorage.setItem('cement_erp_custody_history', JSON.stringify(custodyHistory));
    }
  }, [custodyFund, invoices, custodyHistory, isLoaded]);

  const totalSpent = invoices.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const remainingBalance = (parseFloat(custodyFund.amount) || 0) - totalSpent;

  // 1️⃣ التعامل مع رفـع المرفقات والفواتير (صور / PDF)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          attachmentName: file.name,
          attachmentData: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 2️⃣ حفظ الفاتورة (إضافة / تعديل)
  const handleSubmitInvoice = (e) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.amount) {
      alert("يرجى إدخال رقم الفاتورة والمبلغ!");
      return;
    }

    if (isEditing) {
      setInvoices(prev => prev.map(i => i.id === formData.id ? { ...formData, amount: parseFloat(formData.amount) } : i));
      setIsEditing(false);
    } else {
      setInvoices(prev => [{ ...formData, id: Date.now().toString(), amount: parseFloat(formData.amount) }, ...prev]);
    }

    setFormData({
      id: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      vendor: '',
      description: '',
      amount: '',
      category: 'مواد بناء وتجهيزات',
      attachmentName: '',
      attachmentData: ''
    });
  };

  // 3️⃣ إغلاق وأرشفة العهدة الحالية وفتح جديدة
  const handleCloseAndArchiveCustody = () => {
    if (invoices.length === 0 && custodyFund.amount === 0) {
      alert("العهدة الحالية فارغة بالفعل!");
      return;
    }

    if (confirm(`هل أنت متأكد من إغلاق العهدة (${custodyFund.custodyNo}) وأرشفتها؟`)) {
      const closedRecord = {
        id: Date.now().toString(),
        custodyNo: custodyFund.custodyNo,
        recipient: custodyFund.recipient,
        totalAmount: custodyFund.amount,
        spentAmount: totalSpent,
        remainingAmount: remainingBalance,
        currency: custodyFund.currency,
        closedAt: new Date().toLocaleDateString('ar-LY'),
        invoicesList: [...invoices]
      };

      setCustodyHistory(prev => [closedRecord, ...prev]);
      const nextNo = `CUS-2026-0${custodyHistory.length + 2}`;
      setCustodyFund({ amount: 0, currency: 'LYD', recipient: '', custodyNo: nextNo });
      setInvoices([]);
      alert("✅ تم إغلاق العهدة وأرشفتها بنجاح!");
    }
  };

  // 4️⃣ إعادة فتح عهدة مؤشفة للتعديل عليها
  const handleReopenCustody = (recordToReopen) => {
    if (invoices.length > 0 || custodyFund.amount > 0) {
      const confirmSwap = confirm("توجد عهدة حالية مفتوحة. هل ترغب في أرشفة العهدة الحالية أولاً واسترجاع العهدة المطلوبة؟");
      if (!confirmSwap) return;

      const currentClosed = {
        id: Date.now().toString(),
        custodyNo: custodyFund.custodyNo,
        recipient: custodyFund.recipient,
        totalAmount: custodyFund.amount,
        spentAmount: totalSpent,
        remainingAmount: remainingBalance,
        currency: custodyFund.currency,
        closedAt: new Date().toLocaleDateString('ar-LY'),
        invoicesList: [...invoices]
      };
      setCustodyHistory(prev => [currentClosed, ...prev.filter(r => r.id !== recordToReopen.id)]);
    } else {
      setCustodyHistory(prev => prev.filter(r => r.id !== recordToReopen.id));
    }

    setCustodyFund({
      amount: recordToReopen.totalAmount,
      currency: recordToReopen.currency,
      recipient: recordToReopen.recipient,
      custodyNo: recordToReopen.custodyNo
    });
    setInvoices(recordToReopen.invoicesList || []);
    alert(`🔓 تم فتح العهدة رقم (${recordToReopen.custodyNo}) بنجاح للتعديل وتصحيح الفواتير!`);
  };

  // إضافة موظف للمرتبات
  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.baseSalary) return;

    setPayrollData(prev => ({
      employees: [
        ...(prev.employees || []),
        {
          id: Date.now().toString(),
          name: newEmployee.name,
          role: newEmployee.role,
          type: newEmployee.type,
          baseSalary: parseFloat(newEmployee.baseSalary),
          allowance: parseFloat(newEmployee.allowance || 0)
        }
      ]
    }));
    setNewEmployee({ name: '', role: '', type: 'CWIP - أصول قيد التنفيذ', baseSalary: '', allowance: '' });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', direction: 'rtl', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>🏢 منظومة إدارة العهدة المالية والمرتبات - مصنع الأسمنت</h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>إدارة العهد المفتوحة، الأرشفة الذكية، والمستندات المرفقة</p>
      </header>

      {/* تبويبات التنقل */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('custody')}
          style={{
            flex: 1, padding: '12px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: activeTab === 'custody' ? '#2563eb' : '#e2e8f0', color: activeTab === 'custody' ? 'white' : '#1e293b'
          }}
        >
          💰 إدارة وتسوية العهدة المالية
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          style={{
            flex: 1, padding: '12px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: activeTab === 'payroll' ? '#2563eb' : '#e2e8f0', color: activeTab === 'payroll' ? 'white' : '#1e293b'
          }}
        >
          👥 منظومة المرتبات والسُلف
        </button>
      </div>

      {activeTab === 'custody' ? (
        <div>
          {/* هيدر العهدة الحالية وأزرار الأرشفة والفتح */}
          <div style={{ backgroundColor: 'white', padding: '15px 20px', borderRadius: '12px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>📋 العهدة الحالية المفتوحة ({custodyFund.custodyNo})</h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>المسؤول: <strong>{custodyFund.recipient || 'غير محدد'}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowFundModal(!showFundModal)}
                style={{ padding: '9px 15px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                ⚙️ تخصيص / إضافة عهدة جديدة
              </button>
              <button
                onClick={handleCloseAndArchiveCustody}
                style={{ padding: '9px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                🔒 إغلاق وأرشفة العهدة الحالية
              </button>
            </div>
          </div>

          {/* نافذة تخصيص عهدة جديدة */}
          {showFundModal && (
            <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #bfdbfe' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a', fontSize: '15px' }}>➕ تخصيص عهدة جديدة أو تعديل الحالية:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="اسم المسؤول عن العهدة"
                  value={custodyFund.recipient}
                  onChange={(e) => setCustodyFund(prev => ({ ...prev, recipient: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <input
                  type="number"
                  placeholder="مبلغ العهدة الكلي"
                  value={custodyFund.amount}
                  onChange={(e) => setCustodyFund(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <select
                  value={custodyFund.currency}
                  onChange={(e) => setCustodyFund(prev => ({ ...prev, currency: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="LYD">دينار ليبي (LYD)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
                <button
                  onClick={() => setShowFundModal(false)}
                  style={{ padding: '8px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  حفظ البيانات
                </button>
              </div>
            </div>
          )}

          {/* بطاقات المبالغ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', borderRight: '5px solid #2563eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>إجمالي مبلغ العهدة</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{(custodyFund.amount || 0).toLocaleString()} {custodyFund.currency}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', borderRight: '5px solid #ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>إجمالي المصروفات الحالية</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ef4444', marginTop: '5px' }}>{totalSpent.toLocaleString()} {custodyFund.currency}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', borderRight: '5px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>الصافي المتبقي في العهدة</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: remainingBalance >= 0 ? '#10b981' : '#dc2626', marginTop: '5px' }}>{remainingBalance.toLocaleString()} {custodyFund.currency}</div>
            </div>
          </div>

          {/* نموذج إضافة فاتورة جديدة + زر رفع المرفقات والمستندات */}
          <form onSubmit={handleSubmitInvoice} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '17px', color: '#1e293b' }}>
              {isEditing ? '✏️ تعديل فاتورة' : '➕ إدخال فاتورة / سند جديد مع المرفقات'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>رقم الفاتورة *</label>
                <input type="text" placeholder="INV-2026-001" value={formData.invoiceNumber} onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>التاريخ *</label>
                <input type="date" value={formData.invoiceDate} onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>المورد / الجهة</label>
                <input type="text" placeholder="اسم المورد" value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>المبلغ *</label>
                <input type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>نوع المصروف</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="مواد بناء وتجهيزات">مواد بناء وتجهيزات</option>
                  <option value="معدات وآليات">معدات وآليات</option>
                  <option value="أجور ونقليات">أجور ونقليات</option>
                  <option value="مصاريف إدارية وموقع">مصاريف إدارية وموقع</option>
                </select>
              </div>

              {/* 📎 زر رفع المستندات والفواتير المرفقة */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#2563eb' }}>📎 ارفاق صورة/مستند الفاتورة</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px dashed #2563eb', backgroundColor: '#f0f9ff' }} />
                {formData.attachmentName && <span style={{ fontSize: '11px', color: '#16a34a', display: 'block', marginTop: '2px' }}>✓ تم اختيار: {formData.attachmentName}</span>}
              </div>

              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '5px' }}>
                <button type="submit" style={{ padding: '10px 25px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isEditing ? 'حفظ تعديل الفاتورة' : '➕ إضافة الفاتورة للعهدة'}
                </button>
              </div>
            </div>
          </form>

          {/* جدول الفواتير الحالية مع أزرار معاينة المرفقات */}
          <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
            <div style={{ padding: '12px 15px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '14px' }}>
              جدول فواتير العهدة المفتوحة ({invoices.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
                  <th style={{ padding: '10px' }}>رقم الفاتورة</th>
                  <th style={{ padding: '10px' }}>التاريخ</th>
                  <th style={{ padding: '10px' }}>المورد</th>
                  <th style={{ padding: '10px' }}>المبلغ</th>
                  <th style={{ padding: '10px' }}>المستند المرفق</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>لا توجد فواتير مضافة في العهدة الحالية بعد.</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{inv.invoiceDate}</td>
                      <td style={{ padding: '10px' }}>{inv.vendor || '-'}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#ef4444' }}>{inv.amount?.toLocaleString()} {custodyFund.currency}</td>
                      <td style={{ padding: '10px' }}>
                        {inv.attachmentData ? (
                          <a href={inv.attachmentData} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none', fontSize: '12px' }}>
                            📎 معاينة المرفق
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>بدون مرفق</span>
                        )}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button onClick={() => { setFormData(inv); setIsEditing(true); }} style={{ padding: '4px 8px', marginLeft: '5px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️ تعديل</button>
                        <button onClick={() => setInvoices(prev => prev.filter(i => i.id !== inv.id))} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ حذف</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 📦 أرشيف العهد المغلقة وإعادة الفتح والتعديل */}
          {custodyHistory.length > 0 && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                📦 أرشيف العهد المغلقة ({custodyHistory.length}) - إمكانية إعادة الفتح والتعديل
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {custodyHistory.map((rec) => (
                  <div key={rec.id} style={{ padding: '12px 15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '13px' }}>
                    <div>
                      <strong style={{ color: '#1e3a8a' }}>{rec.custodyNo}</strong> - المسؤول: {rec.recipient}
                      <span style={{ color: '#64748b', marginRight: '10px', fontSize: '12px' }}>(تاريخ الإغلاق: {rec.closedAt})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span>المبلغ: {rec.totalAmount?.toLocaleString()} {rec.currency}</span>
                      <span>المصروف: {rec.spentAmount?.toLocaleString()} {rec.currency}</span>
                      <span style={{ fontWeight: 'bold', color: rec.remainingAmount >= 0 ? '#16a34a' : '#dc2626' }}>
                        المتبقي: {rec.remainingAmount?.toLocaleString()} {rec.currency}
                      </span>
                      <button
                        onClick={() => handleReopenCustody(rec)}
                        style={{ padding: '6px 12px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                      >
                        🔓 إعادة فتح العهدة للتعديل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* قسم المرتبات */
        <div>
          <form onSubmit={handleAddEmployee} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '17px' }}>➕ إضافة موظف جديد للمشروع</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <input type="text" placeholder="اسم الموظف" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <input type="text" placeholder="الوظيفة" value={newEmployee.role} onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})} style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <select value={newEmployee.type} onChange={(e) => setNewEmployee({...newEmployee, type: e.target.value})} style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="CWIP - أصول قيد التنفيذ">CWIP - أصول قيد التنفيذ</option>
                <option value="تشغيلي / لوجستي">تشغيلي / لوجستي</option>
              </select>
              <input type="number" placeholder="المرتب الأساسي (د.ل)" value={newEmployee.baseSalary} onChange={(e) => setNewEmployee({...newEmployee, baseSalary: e.target.value})} style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <input type="number" placeholder="البدلات (د.ل)" value={newEmployee.allowance} onChange={(e) => setNewEmployee({...newEmployee, allowance: e.target.value})} style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <button type="submit" style={{ padding: '9px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>إضافة الموظف</button>
            </div>
          </form>

          <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px' }}>الاسم</th>
                  <th style={{ padding: '10px' }}>الوظيفة</th>
                  <th style={{ padding: '10px' }}>التصنيف</th>
                  <th style={{ padding: '10px' }}>المرتب الأساسي</th>
                  <th style={{ padding: '10px' }}>البدلات</th>
                  <th style={{ padding: '10px' }}>إجمالي الصافي</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.employees?.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{emp.name}</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{emp.role}</td>
                    <td style={{ padding: '10px' }}>{emp.type}</td>
                    <td style={{ padding: '10px' }}>{emp.baseSalary?.toLocaleString()} د.ل</td>
                    <td style={{ padding: '10px', color: '#10b981' }}>+{emp.allowance?.toLocaleString()} د.ل</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{((emp.baseSalary || 0) + (emp.allowance || 0)).toLocaleString()} د.ل</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
