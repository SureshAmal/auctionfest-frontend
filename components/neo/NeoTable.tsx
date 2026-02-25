"use client";

import React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState
} from "@tanstack/react-table";

interface NeoTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onRowClick?: (row: TData) => void;
}

export default function NeoTable<TData, TValue>({ columns, data, onRowClick }: NeoTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <div className="w-full h-full overflow-auto bg-[var(--color-bg)] text-[var(--color-text)] relative">
            <table className="w-full text-center border-separate border-spacing-0 border-4 border-[var(--color-border)] border-r-0 border-b-0">
                <thead className="text-[var(--color-text)]">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                const isSortable = header.column.getCanSort();

                                return (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={`sticky top-0 z-30 bg-[var(--color-surface)] py-3 px-3 font-black uppercase tracking-wider border-r-4 border-b-4 border-[var(--color-border)] last:border-r-0 ${isSortable ? "cursor-pointer hover:brightness-110 active:brightness-120 transition-colors select-none" : ""}`}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            {isSortable && (
                                                <span className="text-[10px] w-4 opacity-50 flex items-center justify-center">
                                                    {{
                                                        asc: "▲",
                                                        desc: "▼",
                                                    }[header.column.getIsSorted() as string] ?? "↕"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody className="bg-[var(--color-bg)] [&>tr>td]:border-b-4 [&>tr>td]:border-r-4 [&>tr>td]:border-[var(--color-border)] [&>tr>td:last-child]:border-r-0 relative z-0">
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => onRowClick && onRowClick(row.original)}
                                className={`hover:brightness-95 odd:bg-[var(--color-bg)] even:bg-[var(--color-bg)] font-bold text-sm ${onRowClick ? "cursor-pointer" : ""}`}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="py-2 px-3 truncate">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="h-24 text-center font-bold uppercase opacity-50">
                                No results.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
