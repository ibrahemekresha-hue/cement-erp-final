'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('custody');

  // بيانات العهدة المفتوحة
  const [custodyFund, setCustodyFund] = useState({
    amount: 50000,
    currency: 'LYD',
    recipient: 'أحمد الصالحي',
    custodyNo: 'CUS-2026-001'
  });

  const [invoices, setInvoices] = useState([]);
  const [custodyHistory, setCustodyHistory] = useState([]);
  const [showFundModal, setShowFundModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // نموذج الفاتورة
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

  // 1️⃣ جلب البيانات من الخادم السحابي (لتتزامن بين الجوال والكمبيوتر)
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resCustody = await fetch('/api/custody');
      const dataCustody = await resCustody.json();
      if (dataCustody) {
        if (dataCustody.custodyFund) setCustodyFund(dataCustody.custodyFund);
        if (dataCustody.invoices) setInvoices(dataCustody.invoices);
        if (dataCustody.custodyHistory) setCustodyHistory(dataCustody.custodyHistory);
      }

      const resPayroll = await fetch('/api/payroll');
      const dataPayroll = await resPayroll.json();
      if (dataPayroll) setPayrollData(dataPayroll);
    } catch (err) {
      console.error("خطأ في جلب البيانات:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ حفظ وتحديث البيانات على الخادم السحابي
  const saveToCloud = async (updatedFund, updatedInvoices, updatedHistory) => {
    try {
      await fetch('/api/custody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custodyFund: updatedFund || custodyFund,
          invoices: updatedInvoices || invoices,
          custodyHistory: updatedHistory || custodyHistory
        })
      });
    } catch (err) {
      console.error("خطأ في المزامنة السحابية:", err);
    }
  };

  // رفع المرفقات
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

  // حفظ الفاتورة والمزامنة سحابياً
  const handleSubmitInvoice = async (e) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.amount) {
      alert("يرجى إدخال رقم الفاتورة والمبلغ!");
      return;
    }

    let updatedInvoices = [];
    if (isEditing) {
      updatedInvoices = invoices.map(i => i.id === formData.id ? { ...formData, amount: parseFloat(formData.amount) } : i);
      setIsEditing(false);
    } else {
      updatedInvoices = [{ ...formData, id: Date.now().toString(), amount: parseFloat(formData.amount) }, ...invoices];
    }

    setInvoices(updatedInvoices);
    await saveToCloud(custodyFund, updatedInvoices, custodyHistory);

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

  // إغلاق العهدة وأرشفتها سحابياً
  const handleCloseAndArchiveCustody = async () => {
    if (invoices.length === 0 && custodyFund.amount === 0) {
      alert("العهدة الحالية فارغة بالفعل!");
      return;
    }

    if (confirm(`هل أنت متأكد من إغلاق العهدة (${custodyFund.custodyNo}) وأرشفتها؟`)) {
      const totalSpent = invoices.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      const remainingBalance = (parseFloat(custodyFund.amount) || 0) - totalSpent;

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

      const updatedHistory = [closedRecord, ...custodyHistory];
      const nextNo = `CUS-2026-0${updatedHistory.length + 1}`;
      const newFund = { amount: 0, currency: 'LYD', recipient: '', custodyNo: nextNo };

      setCustodyHistory(updatedHistory);
      setCustodyFund(newFund);
      setInvoices([]);

      await saveToCloud(newFund, [], updatedHistory);
      alert("✅ تم إغلاق العهدة وأرشفتها وتحديث السحابة بنجاح!");
    }
  };

  // إعادة فتح عهدة مؤرشفة من السحابة
  const handleReopenCustody = async (recordToReopen) => {
    const updatedHistory = custodyHistory.filter(r => r.id !== recordToReopen.id);
    const restoredFund = {
      amount: recordToReopen.totalAmount,
      currency: recordToReopen.currency,
      recipient: recordToReopen.recipient,
      custodyNo: recordToReopen.custodyNo
    };
    const restoredInvoices = recordToReopen.invoicesList || [];

    setCustodyHistory(updatedHistory);
    setCustodyFund(restoredFund);
    setInvoices(restoredInvoices);

    await saveToCloud(restoredFund, restoredInvoices, updatedHistory);
    alert(`🔓 تم فتح العهدة رقم (${recordToReopen.custodyNo}) ومزامنتها على جميع الأجهزة!`);
  };

  // إضافة موظف للمرتبات
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.baseSalary) return;

    const updatedEmployees = [
      ...(payrollData.employees || []),
      {
        id: Date.now().toString(),
        name: newEmployee.name,
        role: newEmployee.role,
        type: newEmployee.type,
        baseSalary: parseFloat(newEmployee.baseSalary),
        allowance: parseFloat(newEmployee.allowance || 0)
      }
    ];

    const updatedPayroll = { employees: updatedEmployees };
    setPayrollData(updatedPayroll);
    setNewEmployee({ name: '', role: '', type: 'CWIP - أصول قيد التنفيذ', baseSalary: '', allowance: '' });

    await fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayroll)
    });
  };

  const totalSpent = invoices.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const remainingBalance = (parseFloat(custodyFund.amount) || 0) - totalSpent;

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', direction: 'rtl', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>🏢 منظومة إدارة العهدة المالية والمرتبات - مصنع الأسمنت</h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>مزامنة سحابية مباشرة بين الجوال والكمبيوتر عبر السيرفر</p>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px', color: '#64748b' }}>⏳ جاري المزامنة مع الخادم السحابي...</div>
      ) : activeTab === 'custody' ? (
        <div>
          {/* هيدر العهدة */}
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

          {/* نافذة تخصيص عهدة */}
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
                  onClick={async () => {
                    setShowFundModal(false);
                    await saveToCloud(custodyFund, invoices, custodyHistory);
                  }}
                  style={{ padding: '8px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  حفظ ومزامنة
                </button>
              </div>
            </div>
          )}

          {/* بطاقات المبالغ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', borderRight: '5px solid #2563eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>إجمالي مبلغ العهدة</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{(custodyFund.amount || 0).toLocaleString()}
