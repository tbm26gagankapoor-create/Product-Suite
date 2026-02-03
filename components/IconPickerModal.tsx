import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Link2, Palette, Grid3X3, Check, Image as ImageIcon, Trash2 } from 'lucide-react';
import ProductIcon, { PRODUCT_ICONS, PRODUCT_GRADIENTS, getProductTheme, ProductIconData } from './ProductIcon';

type TabType = 'icons' | 'upload' | 'url';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (iconData: ProductIconData) => void;
  currentIcon?: ProductIconData;
  projectId: string;
  projectName?: string;
}

const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentIcon,
  projectId,
  projectName = 'Product',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('icons');
  const [selectedIcon, setSelectedIcon] = useState<string>(currentIcon?.icon || '');
  const [selectedGradient, setSelectedGradient] = useState<string>(
    currentIcon?.iconColor || getProductTheme(projectId).gradient
  );
  const [imageUrl, setImageUrl] = useState<string>(currentIcon?.imageUrl || '');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Check file size (max 2MB for base64 storage)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setImageUrl(''); // Clear URL when uploading
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setUploadedImage(''); // Clear uploaded when using URL
    if (url && !validateUrl(url)) {
      setUrlError('Please enter a valid URL');
    } else {
      setUrlError('');
    }
  };

  const handleSave = () => {
    const iconData: ProductIconData = {};

    // Priority: uploaded image > URL > icon selection
    if (uploadedImage) {
      iconData.imageUrl = uploadedImage;
    } else if (imageUrl && validateUrl(imageUrl)) {
      iconData.imageUrl = imageUrl;
    } else if (selectedIcon) {
      iconData.icon = selectedIcon;
      iconData.iconColor = selectedGradient;
    } else {
      // Use default gradient
      iconData.iconColor = selectedGradient;
    }

    onSave(iconData);
    onClose();
  };

  const handleRemoveImage = () => {
    setUploadedImage('');
    setImageUrl('');
  };

  const previewProject = {
    id: projectId,
    name: projectName,
    imageUrl: uploadedImage || imageUrl || undefined,
    icon: (!uploadedImage && !imageUrl) ? selectedIcon : undefined,
    iconColor: selectedGradient,
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#15171E] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ProductIcon project={previewProject} size="md" />
            <div>
              <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Product Icon</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Customize how your product appears</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-[#1F2128]">
          <button
            onClick={() => setActiveTab('icons')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'icons'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/5'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Grid3X3 size={16} />
            Icons
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/5'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Upload size={16} />
            Upload
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/5'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Link2 size={16} />
            URL
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
          {activeTab === 'icons' && (
            <div className="space-y-6">
              {/* Icon Selection */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 block">
                  Choose Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRODUCT_ICONS.map(({ name, Icon }) => (
                    <button
                      key={name}
                      onClick={() => setSelectedIcon(name)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        selectedIcon === name
                          ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500'
                          : 'bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2D2F36]'
                      }`}
                      title={name}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Gradient Selection */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Palette size={12} />
                  Choose Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRODUCT_GRADIENTS.map(({ name, value }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedGradient(value)}
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${value} transition-all relative ${
                        selectedGradient === value ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-[#15171E]' : ''
                      }`}
                      title={name}
                    >
                      {selectedGradient === value && (
                        <Check size={16} className="absolute inset-0 m-auto text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              {uploadedImage ? (
                <div className="relative">
                  <div className="aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#1F2128]">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-gray-200 dark:border-[#2D2F36] hover:border-blue-400 dark:hover:border-blue-500/50'
                  }`}
                >
                  <div className="w-16 h-16 bg-gray-100 dark:bg-[#1F2128] rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Drop an image here or click to upload
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF up to 2MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className={`w-full bg-gray-50 dark:bg-[#1F2128] border rounded-lg px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 ${
                    urlError ? 'border-red-500' : 'border-gray-200 dark:border-[#2D2F36]'
                  }`}
                />
                {urlError && (
                  <p className="text-xs text-red-500 mt-1">{urlError}</p>
                )}
              </div>

              {imageUrl && validateUrl(imageUrl) && (
                <div className="relative">
                  <div className="aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#1F2128]">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setUrlError('Unable to load image')}
                    />
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Enter a direct link to an image (PNG, JPG, GIF, SVG)
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-gray-50 dark:bg-[#0B0C0E]/50">
          <button
            onClick={() => {
              setSelectedIcon('');
              setSelectedGradient(getProductTheme(projectId).gradient);
              handleRemoveImage();
            }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!!urlError}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              Save Icon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconPickerModal;
