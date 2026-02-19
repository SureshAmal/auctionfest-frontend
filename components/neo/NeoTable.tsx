"use client";

import React from "react";

interface NeoTableProps {
    headers: string[];
    data: any[];
    renderRow: (item: any, index: number) => React.ReactNode;
}

export default function NeoTable({ headers, data, renderRow }: NeoTableProps) {
    return (
        <div className="w-full overflow-x-auto neo-border bg-white text-black">
            <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--color-surface)] text-black border-b-4 border-black">
                    <tr>
                        {headers.map((header, i) => (
                            <th key={i} className="p-4 font-black uppercase tracking-wider border-r-4 border-black last:border-r-0">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y-4 divide-black">
                    {data.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-100 transition-colors odd:bg-white even:bg-gray-50 border-b-4 border-black last:border-b-0">
                            {renderRow(item, i)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
