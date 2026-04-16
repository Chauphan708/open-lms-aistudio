import React from 'react';
import { ParentLayout } from '../../components/ParentLayout';

export const ParentBehavior = () => {
  return (
    <ParentLayout>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Điểm Hành Vi (ClassFun)</h2>
          <p className="text-gray-500">Tính năng đang trong quá trình phát triển.</p>
        </div>
      </div>
    </ParentLayout>
  );
};
