'use client';

import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useOnboarding } from '../OnboardingProvider';
import { InventoryItemData, inventoryItemSchema } from '../../../lib/onboarding';
import { ItemCard } from './components/ItemCard';
import { SummaryPanel } from './components/SummaryPanel';
import { StepFooter } from '../components/StepFooter';
import { Plus, UploadCloud, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// Ensure each item has a unique string ID for dnd-kit
type DraggableItem = InventoryItemData & { id: string };

const createEmptyItem = (): DraggableItem => ({
  id: crypto.randomUUID(),
  name: '',
  grade: '',
  unit: 'cft',
  hsnCode: '4407',
  gstRate: 12,
  costPrice: 0,
  sellingPrice: 0,
  currentStock: 0,
  minStockLevel: 0,
  sortOrder: 0,
});

export default function InventoryStep() {
  const { data, updateData, nextStep } = useOnboarding();
  
  const [items, setItems] = useState<DraggableItem[]>(
    data.inventory.length > 0 
      ? data.inventory.map(i => ({ ...i, id: i.id || crypto.randomUUID() })) 
      : [createEmptyItem()]
  );
  
  const [errors, setErrors] = useState<Record<string, any>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addItem = () => setItems([...items, createEmptyItem()]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  
  const updateItem = (index: number, field: keyof InventoryItemData, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const importedItems: DraggableItem[] = data.map((row: any) => ({
        id: crypto.randomUUID(),
        name: row.Species || row.Name || '',
        grade: row.Grade || '',
        unit: row.Unit || 'cft',
        hsnCode: String(row.HSN || '4407'),
        gstRate: parseFloat(row.GST) || 12,
        costPrice: Math.round(parseFloat(row['Cost Price']) * 100) || 0,
        sellingPrice: Math.round(parseFloat(row['Selling Price']) * 100) || 0,
        currentStock: parseFloat(row['Opening Stock']) || 0,
        minStockLevel: 0,
        sortOrder: 0,
      }));

      setItems(prev => [...prev, ...importedItems]);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      Species: 'Teak Wood',
      Grade: 'A1',
      Unit: 'cft',
      'Cost Price': 4500,
      'Selling Price': 5500,
      'Opening Stock': 150,
      HSN: '4407',
      GST: 12
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "TimberFlow_Inventory_Template.xlsx");
  };

  const onSubmit = async () => {
    // Validate all items
    let hasErrors = false;
    const newErrors: Record<string, any> = {};

    const validItems = items.filter(i => i.name || i.costPrice > 0 || i.sellingPrice > 0);
    
    if (validItems.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    validItems.forEach((item, idx) => {
      const result = inventoryItemSchema.safeParse(item);
      if (!result.success) {
        hasErrors = true;
        newErrors[item.id] = result.error.format();
      } else if (item.costPrice > item.sellingPrice) {
        hasErrors = true;
        newErrors[item.id] = { sellingPrice: { _errors: ['Selling price cannot be less than cost'] } };
      }
    });

    setErrors(newErrors);

    if (hasErrors) {
      // Scroll to top to see errors ideally
      return;
    }

    // Add sortOrder
    const finalItems = validItems.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    updateData('inventory', finalItems);

    await nextStep(async () => {
      try {
        const res = await fetch('/api/v1/onboarding/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: finalItems })
        });
        return res.ok;
      } catch (err) {
        console.error(err);
        return false;
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 p-4 md:p-10 max-w-[1400px] mx-auto">
      <div className="flex-1 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black mb-2">Setup your inventory</h1>
            <p className="text-white/50 text-sm">Add your primary products and set baseline margins.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={downloadTemplate} className="text-xs font-bold text-white/40 hover:text-white flex items-center gap-2">
              <Download size={14} /> Template
            </button>
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleExcelImport}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <button className="h-10 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
                <UploadCloud size={16} /> Import Excel
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              {items.map((item, index) => (
                <ItemCard 
                  key={item.id} 
                  id={item.id}
                  item={item} 
                  index={index} 
                  updateItem={updateItem} 
                  removeItem={removeItem} 
                  errors={errors[item.id]}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <button 
          onClick={addItem}
          className="w-full h-14 border-2 border-dashed border-white/10 rounded-xl text-white/40 font-bold hover:border-white/20 hover:text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} /> Add another item
        </button>
      </div>

      <div className="w-full lg:w-[320px] shrink-0">
        <SummaryPanel items={items} />
      </div>

      <StepFooter onContinue={onSubmit} />
    </div>
  );
}
