import React, { useState, useEffect } from 'react';
import { Edit, Save, Trash2, ShieldCheck } from 'lucide-react';
import API_URL from '../config';

export default function AdminDashboard() {
    const [tracks, setTracks] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Fetch tracks specifically for management
    const fetchAdminTracks = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/admin/tracks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setTracks(data);
    };

    useEffect(() => {
        fetchAdminTracks();
    }, []);

    const handleSave = async (id) => {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/admin/tracks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(editForm)
        });
        setEditingId(null);
        fetchAdminTracks();
    };

    return (
        <div className="p-8 max-w-6xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <ShieldCheck className="text-green-500" /> Admin Content Manager
            </h1>

            {/* Management Table */}
            <div className="bg-[#18181d] rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4">Artist</th>
                            <th className="p-4">Genre</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tracks.map(track => (
                            <tr key={track.id} className="border-t border-white/5 hover:bg-white/5">
                                <td className="p-4">
                                    {editingId === track.id ?
                                        <input className="bg-black border border-white/20 p-1 rounded" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /> :
                                        track.title}
                                </td>
                                <td className="p-4">{track.artist}</td>
                                <td className="p-4">{track.genre || 'N/A'}</td>
                                <td className="p-4 flex gap-2">
                                    {editingId === track.id ?
                                        <button onClick={() => handleSave(track.id)}><Save size={18} className="text-green-500" /></button> :
                                        <button onClick={() => { setEditingId(track.id); setEditForm(track); }}><Edit size={18} /></button>
                                    }
                                    <button className="text-red-500"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}