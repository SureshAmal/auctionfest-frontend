"use client";

import React from "react";

interface NeoTableProps {
    headers: ({ key: string; label: string } | string)[];
    data: any[];
    renderRow: (item: any, index: number) => React.ReactNode;
    onSort?: (key: string) => void;
    sortKey?: string | null;
    sortDirection?: "asc" | "desc" | null;
}

export default function NeoTable({ headers, data, renderRow, onSort, sortKey, sortDirection }: NeoTableProps) {
    return (
        <div className="w-full h-full overflow-auto bg-[var(--color-bg)] text-[var(--color-text)] relative">
            <table className="w-full text-center border-separate border-spacing-0 neo-border border-b-0 border-r-0">
                <thead className="text-[var(--color-text)]">
                    <tr>
                        {headers.map((header, i) => {
                            const isString = typeof header === "string";
                            const label = isString ? header : header.label;
                            const key = isString ? null : header.key;
                            const isSortable = !!key && !!onSort;

                            return (
                                <th
                                    key={i}
                                    className={`sticky top-0 z-30 bg-[var(--color-surface)] p-4 font-black uppercase tracking-wider border-r-4 border-b-4 border-black last:border-r-0 ${isSortable ? "cursor-pointer hover:bg-[#ffe55c] active:bg-[#ffed99] transition-colors" : ""}`}
                                    onClick={() => isSortable && onSort(key)}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {label}
                                        {isSortable && sortKey === key && (
                                            <span className="text-xs">{sortDirection === "asc" ? "▲" : "▼"}</span>
                                        )}
                                        {isSortable && sortKey !== key && (
                                            <span className="text-xs opacity-20">↕</span>
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody className="bg-[var(--color-bg)] [&>tr>td]:border-b-4 [&>tr>td]:border-r-4 [&>tr>td]:border-black [&>tr>td:last-child]:border-r-0">
                    {data.map((item, i) => (
                        <tr key={i} className="hover:bg-black/5 transition-colors odd:bg-[var(--color-bg)] even:bg-[var(--color-bg)]">
                            {renderRow(item, i)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
