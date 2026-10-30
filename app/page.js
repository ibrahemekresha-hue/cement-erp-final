'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('custody');
  
  // بيانات العهدة المالية
  const [custodyData, setCustodyData] = useState({ custodyAmount: 50000, expenses: [] });
  const [newExpense, setNewExpense] = useState({ item: '', amount: '', category: 'تشغيلي', notes: '' });

  // بيانات المرتبات والسُلف
  const [payrollData, setPayrollData] = useState({ employees: [] });
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', type: 'CWIP - أصول قيد التنفيذ', baseSalary: '', allowance: '' });

  const [loading, setLoading] = useState(true);

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resCustody = await fetch('/api/custody');
      const dataCustody = await resCustody.json();
      setCustodyData(dataCustody);

      const resPayroll = await fetch('/api/payroll');
      const dataPayroll = await resPayroll.json();
      setPayrollData(dataPayroll);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // إضافة مصروف عهدة جديد
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.item || !newExpense.amount) return;

    const updatedExpenses = [
      ...(custodyData.expenses || []),
      {
        id: Date.now().toString(),
        item: newExpense.item,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        date: new Date().toISOString().split('T')[0],
        notes: newExpense.notes
      }
    ];

    const updated = { ...custodyData, expenses: updatedExpenses };
    setCustodyData(updated);
    setNewExpense({ item: '', amount: '', category: 'تشغيلي', notes: '' });

    await fetch('/api/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  // إضافة موظف / مرتب جديد
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.baseSalary) return;

    const updatedEmployees = [
      ...(payrollData.employees || []),
      {
        id: Date.now().toString(),
        name:
          
