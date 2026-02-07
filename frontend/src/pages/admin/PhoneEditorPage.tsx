import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, ChevronDown, ChevronUp } from 'lucide-react';

interface PhoneFormData {
    // Core fields
    name: string;
    brand: string;
    model: string;
    slug: string;
    price: string;
    url: string;
    img_url: string;

    // Display
    display_type: string;
    screen_size_inches: string;
    display_resolution: string;
    pixel_density_ppi: string;
    refresh_rate_hz: string;
    screen_protection: string;

    // Performance
    chipset: string;
    cpu: string;
    gpu: string;
    ram: string;
    internal_storage: string;

    // Camera
    camera_setup: string;
    primary_camera_resolution: string;
    selfie_camera_resolution: string;
    main_camera: string;
    front_camera: string;

    // Battery
    battery_type: string;
    capacity: string;
    quick_charging: string;
    wireless_charging: string;

    // Design
    build: string;
    weight: string;
    thickness: string;
    colors: string;
    waterproof: string;
    ip_rating: string;

    // Connectivity
    network: string;
    bluetooth: string;
    wlan: string;
    nfc: string;
    usb: string;

    // OS & Security
    operating_system: string;
    os_version: string;
    fingerprint_sensor: string;
    face_unlock: string;

    // Other
    status: string;
    release_date: string;
}

// Move these components outside to prevent re-creation on every render
const FormSection: React.FC<{
    title: string;
    section: string;
    children: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
}> = ({ title, section, children, isExpanded, onToggle }) => {
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {isExpanded && (
                <div className="p-6 bg-white dark:bg-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {children}
                </div>
            )}
        </div>
    );
};

const InputField: React.FC<{
    label: string;
    field: keyof PhoneFormData;
    value: string;
    onChange: (field: keyof PhoneFormData, value: string) => void;
    required?: boolean;
    type?: string;
}> = ({ label, field, value, onChange, required = false, type = 'text' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent"
        />
    </div>
);

const PhoneEditorPage: React.FC = () => {
    const { phoneId } = useParams<{ phoneId?: string }>();
    const navigate = useNavigate();
    const isEditMode = !!phoneId;

    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['core']));

    const [formData, setFormData] = useState<PhoneFormData>({
        name: '',
        brand: '',
        model: '',
        slug: '',
        price: '',
        url: '',
        img_url: '',
        display_type: '',
        screen_size_inches: '',
        display_resolution: '',
        pixel_density_ppi: '',
        refresh_rate_hz: '',
        screen_protection: '',
        chipset: '',
        cpu: '',
        gpu: '',
        ram: '',
        internal_storage: '',
        camera_setup: '',
        primary_camera_resolution: '',
        selfie_camera_resolution: '',
        main_camera: '',
        front_camera: '',
        battery_type: '',
        capacity: '',
        quick_charging: '',
        wireless_charging: '',
        build: '',
        weight: '',
        thickness: '',
        colors: '',
        waterproof: '',
        ip_rating: '',
        network: '',
        bluetooth: '',
        wlan: '',
        nfc: '',
        usb: '',
        operating_system: '',
        os_version: '',
        fingerprint_sensor: '',
        face_unlock: '',
        status: '',
        release_date: ''
    });

    useEffect(() => {
        if (isEditMode) {
            fetchPhone();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phoneId]);

    const fetchPhone = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const API_BASE = process.env.REACT_APP_API_BASE || '';

            const response = await fetch(`${API_BASE}/api/v1/phones/${phoneId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setFormData(data);
            }
        } catch (error) {
            console.error('Error fetching phone:', error);
            alert('Failed to load phone data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('auth_token');
            const API_BASE = process.env.REACT_APP_API_BASE || '';

            const url = isEditMode
                ? `${API_BASE}/api/v1/admin/phones/${phoneId}`
                : `${API_BASE}/api/v1/admin/phones`;

            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                navigate('/admin/phones');
            } else {
                const err = await response.json();
                alert(`Failed: ${err.detail}`);
            }
        } catch (error) {
            console.error('Error saving phone:', error);
            alert('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof PhoneFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Auto-generate slug from name if it's a new phone
        if (field === 'name' && !isEditMode) {
            const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(section)) {
                newSet.delete(section);
            } else {
                newSet.add(section);
            }
            return newSet;
        });
    };

    if (loading) {
        return <div className="animate-pulse">Loading phone data...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {isEditMode ? 'Edit Phone' : 'Add New Phone'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {isEditMode ? 'Update phone specifications' : 'Add a new phone to the catalog'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/admin/phones')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <X size={20} />
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Core Information */}
                <FormSection title="Core Information" section="core" isExpanded={expandedSections.has('core')} onToggle={() => toggleSection('core')}>
                    <InputField label="Phone Name" field="name" value={formData.name} onChange={handleChange} required />
                    <InputField label="Brand" field="brand" value={formData.brand} onChange={handleChange} required />
                    <InputField label="Model" field="model" value={formData.model} onChange={handleChange} required />
                    <InputField label="Slug" field="slug" value={formData.slug} onChange={handleChange} required />
                    <InputField label="Price" field="price" value={formData.price} onChange={handleChange} required />
                    <InputField label="Product URL" field="url" value={formData.url} onChange={handleChange} type="url" />
                    <InputField label="Image URL" field="img_url" value={formData.img_url} onChange={handleChange} type="url" />
                    <InputField label="Status" field="status" value={formData.status} onChange={handleChange} />
                    <InputField label="Release Date" field="release_date" value={formData.release_date} onChange={handleChange} />
                </FormSection>

                {/* Display */}
                <FormSection title="Display" section="display" isExpanded={expandedSections.has('display')} onToggle={() => toggleSection('display')}>
                    <InputField label="Display Type" field="display_type" value={formData.display_type} onChange={handleChange} />
                    <InputField label="Screen Size (inches)" field="screen_size_inches" value={formData.screen_size_inches} onChange={handleChange} />
                    <InputField label="Resolution" field="display_resolution" value={formData.display_resolution} onChange={handleChange} />
                    <InputField label="Pixel Density (PPI)" field="pixel_density_ppi" value={formData.pixel_density_ppi} onChange={handleChange} />
                    <InputField label="Refresh Rate (Hz)" field="refresh_rate_hz" value={formData.refresh_rate_hz} onChange={handleChange} />
                    <InputField label="Screen Protection" field="screen_protection" value={formData.screen_protection} onChange={handleChange} />
                </FormSection>

                {/* Performance */}
                <FormSection title="Performance" section="performance" isExpanded={expandedSections.has('performance')} onToggle={() => toggleSection('performance')}>
                    <InputField label="Chipset" field="chipset" value={formData.chipset} onChange={handleChange} />
                    <InputField label="CPU" field="cpu" value={formData.cpu} onChange={handleChange} />
                    <InputField label="GPU" field="gpu" value={formData.gpu} onChange={handleChange} />
                    <InputField label="RAM" field="ram" value={formData.ram} onChange={handleChange} />
                    <InputField label="Internal Storage" field="internal_storage" value={formData.internal_storage} onChange={handleChange} />
                </FormSection>

                {/* Camera */}
                <FormSection title="Camera" section="camera" isExpanded={expandedSections.has('camera')} onToggle={() => toggleSection('camera')}>
                    <InputField label="Camera Setup" field="camera_setup" value={formData.camera_setup} onChange={handleChange} />
                    <InputField label="Primary Camera" field="primary_camera_resolution" value={formData.primary_camera_resolution} onChange={handleChange} />
                    <InputField label="Selfie Camera" field="selfie_camera_resolution" value={formData.selfie_camera_resolution} onChange={handleChange} />
                    <InputField label="Main Camera Details" field="main_camera" value={formData.main_camera} onChange={handleChange} />
                    <InputField label="Front Camera Details" field="front_camera" value={formData.front_camera} onChange={handleChange} />
                </FormSection>

                {/* Battery */}
                <FormSection title="Battery" section="battery" isExpanded={expandedSections.has('battery')} onToggle={() => toggleSection('battery')}>
                    <InputField label="Battery Type" field="battery_type" value={formData.battery_type} onChange={handleChange} />
                    <InputField label="Capacity" field="capacity" value={formData.capacity} onChange={handleChange} />
                    <InputField label="Quick Charging" field="quick_charging" value={formData.quick_charging} onChange={handleChange} />
                    <InputField label="Wireless Charging" field="wireless_charging" value={formData.wireless_charging} onChange={handleChange} />
                </FormSection>

                {/* Design */}
                <FormSection title="Design & Build" section="design" isExpanded={expandedSections.has('design')} onToggle={() => toggleSection('design')}>
                    <InputField label="Build Materials" field="build" value={formData.build} onChange={handleChange} />
                    <InputField label="Weight" field="weight" value={formData.weight} onChange={handleChange} />
                    <InputField label="Thickness" field="thickness" value={formData.thickness} onChange={handleChange} />
                    <InputField label="Colors" field="colors" value={formData.colors} onChange={handleChange} />
                    <InputField label="Waterproof" field="waterproof" value={formData.waterproof} onChange={handleChange} />
                    <InputField label="IP Rating" field="ip_rating" value={formData.ip_rating} onChange={handleChange} />
                </FormSection>

                {/* Connectivity */}
                <FormSection title="Connectivity" section="connectivity" isExpanded={expandedSections.has('connectivity')} onToggle={() => toggleSection('connectivity')}>
                    <InputField label="Network" field="network" value={formData.network} onChange={handleChange} />
                    <InputField label="Bluetooth" field="bluetooth" value={formData.bluetooth} onChange={handleChange} />
                    <InputField label="WLAN" field="wlan" value={formData.wlan} onChange={handleChange} />
                    <InputField label="NFC" field="nfc" value={formData.nfc} onChange={handleChange} />
                    <InputField label="USB" field="usb" value={formData.usb} onChange={handleChange} />
                </FormSection>

                {/* OS & Security */}
                <FormSection title="OS & Security" section="os" isExpanded={expandedSections.has('os')} onToggle={() => toggleSection('os')}>
                    <InputField label="Operating System" field="operating_system" value={formData.operating_system} onChange={handleChange} />
                    <InputField label="OS Version" field="os_version" value={formData.os_version} onChange={handleChange} />
                    <InputField label="Fingerprint Sensor" field="fingerprint_sensor" value={formData.fingerprint_sensor} onChange={handleChange} />
                    <InputField label="Face Unlock" field="face_unlock" value={formData.face_unlock} onChange={handleChange} />
                </FormSection>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/phones')}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={20} />
                        {saving ? 'Saving...' : (isEditMode ? 'Update Phone' : 'Add Phone')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PhoneEditorPage;
