import React from 'react';
import '../App.css';

export default function CustomTable({ headers, children }) {
    return (
        <table className="table">
            <thead>
                <tr>
                    {headers.map((header, idx) => (
                        <th key={idx}>{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {children}
            </tbody>
        </table>
    );
}
