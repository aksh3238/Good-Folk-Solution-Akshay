import React, { useState, useRef } from 'react';
import {
  Upload, Image as ImageIcon, Trash2, Eye, Check, AlertTriangle,
  Monitor, Smartphone, Phone, MessageSquare, ExternalLink, Link2,
  Save, RefreshCw, CheckCircle2, ShieldAlert
} from 'lucide-react';
import type {
  CMSSiteContent,
  WebsitePageKey,
  BannerCtaDestination,
  PageBannerConfig
} from '../types';
import { useSiteContent } from '../context/SiteContentContext';

interface PageBannerManagerProps {
  token: string;
  siteContent: CMSSiteContent;
  onUpdateSiteContent: (updated: CMSSiteContent) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const PAGES: Array<{ key: WebsitePageKey; label: string; desc: string }> = [
  { key: 'home', label: 'Home', desc: 'Main landing hero banner displayed at the top of the homepage.' },
  { key: 'services', label: 'Services', desc: 'Header banner showcasing studio capabilities and agency direction.' },
  { key: 'portfolio', label: 'Portfolio', desc: 'Case study showcase banner positioned at the top of Selected Work.' },
  { key: 'about', label: 'About Us', desc: 'Studio story and brand ethos hero banner.' },
  { key: 'contact', label: 'Contact', desc: 'Inquiry and client briefing hero banner.' }
];

export const PageBannerManager: React.FC<PageBannerManagerProps> = ({
  token,
  siteContent,
  onUpdateSiteContent,
  showToast
}) => {
  const { refreshContent } = useSiteContent();
  const [activePage, setActivePage] = useState<WebsitePageKey>('home');
  const [saving, setSaving] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [ratioWarningDesktop, setRatioWarningDesktop] = useState<string | null>(null);
  const [ratioWarningMobile, setRatioWarningMobile] = useState<string | null>(null);
  const [showSeparateMobileCta, setShowSeparateMobileCta] = useState(false);

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const rawBanners = siteContent.pageBanners || {};
  const currentConfig: PageBannerConfig = rawBanners[activePage] || {
    desktopImageUrl: '',
    mobileImageUrl: '',
    ctaType: 'enquiry',
    ctaUrl: '',
    mobileCtaType: 'enquiry',
    mobileCtaUrl: '',
    enabled: true
  };

  const handleUpdateCurrent = (patch: Partial<PageBannerConfig>) => {
    const updatedPageConfig: PageBannerConfig = {
      ...currentConfig,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    const updatedBanners = {
      ...rawBanners,
      [activePage]: updatedPageConfig
    };
    onUpdateSiteContent({
      ...siteContent,
      pageBanners: updatedBanners
    });
  };

  // Upload helper for base64
  const uploadBannerFile = async (
    file: File,
    type: 'desktop' | 'mobile'
  ): Promise<{ url: string; width: number; height: number } | null> => {
    // Accepted formats: JPG, PNG, WebP
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      showToast('Invalid file format. Accepted formats: JPG, PNG, and WebP only.', 'error');
      return null;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('File exceeds 25 MB limit. Please compress or optimize the image.', 'error');
      return null;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        // Check image dimensions & aspect ratio
        const img = new Image();
        img.onload = async () => {
          const { width, height } = img;
          const ratio = width / height;

          // Check aspect ratio
          if (type === 'desktop') {
            // Target: 1920 / 600 = 3.2
            if (ratio < 2.4 || ratio > 4.2) {
              setRatioWarningDesktop(
                `Warning: Selected image is ${width}×${height}px (aspect ratio ${ratio.toFixed(2)}:1). Recommended dimension is 1920 × 600 px (~3.2:1).`
              );
            } else {
              setRatioWarningDesktop(null);
            }
          } else {
            // Target: 750 / 1000 = 0.75
            if (ratio > 1.1 || ratio < 0.55) {
              setRatioWarningMobile(
                `Warning: Selected image is ${width}×${height}px (aspect ratio ${ratio.toFixed(2)}:1). Recommended dimension is 750 × 1000 px (~0.75:1 portrait).`
              );
            } else {
              setRatioWarningMobile(null);
            }
          }

          try {
            const res = await fetch('/api/admin/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                dataUrl,
                filename: file.name
              })
            });
            const data = await res.json();
            if (res.ok && data.url) {
              resolve({ url: data.url, width, height });
            } else {
              reject(new Error(data.error || 'Upload failed'));
            }
          } catch (err: any) {
            reject(new Error(err.message || 'Network upload error'));
          }
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/site-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ siteContent })
      });
      if (res.ok) {
        showToast('Page custom banners saved and published successfully!');
        if (refreshContent) refreshContent();
      } else {
        showToast('Failed to save banner configuration', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving banners', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activePageInfo = PAGES.find(p => p.key === activePage) || PAGES[0];

  return (
    <div className="space-y-6">
      {/* Top Description & Page Tabs */}
      <div className="bg-white p-6 rounded-3xl border border-[#E6E8ED] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#173B75] flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#F07822]" />
              <span>Full-Graphic Custom Banners (Desktop & Mobile)</span>
            </h3>
            <p className="text-xs text-[#252A34]/75 mt-1 max-w-2xl leading-relaxed">
              Upload pre-designed banners containing embedded artwork, typography, and CTA graphics. When uploaded, the website automatically displays your graphic directly without extra text overlays or duplicate buttons.
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-[#F07822] hover:bg-[#d65805] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save & Publish Banners</span>
          </button>
        </div>

        {/* 5 Page Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E6E8ED]">
          {PAGES.map(p => {
            const hasBanner = Boolean(
              rawBanners[p.key]?.desktopImageUrl || rawBanners[p.key]?.mobileImageUrl
            );
            return (
              <button
                key={p.key}
                onClick={() => {
                  setActivePage(p.key);
                  setRatioWarningDesktop(null);
                  setRatioWarningMobile(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activePage === p.key
                    ? 'bg-[#173B75] text-white shadow-sm'
                    : 'bg-[#F7F7F5] text-[#173B75] hover:bg-[#EEF2F9]'
                }`}
              >
                <span>{p.label}</span>
                {hasBanner && (
                  <span className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-[#242832]/70 bg-[#F7F7F5] px-3.5 py-2 rounded-xl border border-[#E6E8ED]">
          <strong>Active Page: {activePageInfo.label}</strong> — {activePageInfo.desc}
        </div>
      </div>

      {/* Main Upload & Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: UPLOAD CONTROLS & CTA SETTINGS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. DESKTOP BANNER UPLOAD */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E8ED] shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#173B75] flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[#F07822]" />
                  <span>Desktop Banner</span>
                </h4>
                <p className="text-[11px] text-[#252A34]/70 mt-0.5">
                  Displayed on desktop screens (768px wide and above).
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono font-bold text-[#173B75] bg-[#EEF2F9] px-2.5 py-0.5 rounded-md">
                  1920 × 600 px (16:5)
                </span>
                <div className="text-[10px] text-[#252A34]/60 mt-0.5">
                  JPG, PNG, WebP · Max 25 MB
                </div>
              </div>
            </div>

            {ratioWarningDesktop && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{ratioWarningDesktop}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentConfig.desktopImageUrl || ''}
                  onChange={e => handleUpdateCurrent({ desktopImageUrl: e.target.value })}
                  placeholder="Paste desktop banner URL or upload an image file..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#E6E8ED] bg-white focus:outline-none focus:ring-1 focus:ring-[#F07822]"
                />
                <input
                  type="file"
                  ref={desktopFileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingDesktop(true);
                      try {
                        const res = await uploadBannerFile(file, 'desktop');
                        if (res) {
                          handleUpdateCurrent({ desktopImageUrl: res.url });
                          showToast('Desktop banner uploaded successfully!');
                        }
                      } catch (err: any) {
                        showToast(err.message || 'Desktop banner upload failed', 'error');
                      } finally {
                        setUploadingDesktop(false);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingDesktop}
                  onClick={() => desktopFileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#173B75] hover:bg-[#112d5a] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-[#F07822]" />
                  <span>{uploadingDesktop ? 'Uploading...' : 'Upload'}</span>
                </button>
                {currentConfig.desktopImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateCurrent({ desktopImageUrl: '' });
                      setRatioWarningDesktop(null);
                    }}
                    className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Remove desktop banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. MOBILE BANNER UPLOAD */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E8ED] shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#173B75] flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#F07822]" />
                  <span>Mobile Banner</span>
                </h4>
                <p className="text-[11px] text-[#252A34]/70 mt-0.5">
                  Displayed on mobile screens (&lt;768px). If omitted, desktop banner is used responsively as a fallback.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono font-bold text-[#173B75] bg-[#EEF2F9] px-2.5 py-0.5 rounded-md">
                  750 × 1000 px (3:4)
                </span>
                <div className="text-[10px] text-[#252A34]/60 mt-0.5">
                  JPG, PNG, WebP · Max 25 MB
                </div>
              </div>
            </div>

            {ratioWarningMobile && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{ratioWarningMobile}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentConfig.mobileImageUrl || ''}
                  onChange={e => handleUpdateCurrent({ mobileImageUrl: e.target.value })}
                  placeholder="Paste mobile banner URL or upload an image file..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#E6E8ED] bg-white focus:outline-none focus:ring-1 focus:ring-[#F07822]"
                />
                <input
                  type="file"
                  ref={mobileFileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingMobile(true);
                      try {
                        const res = await uploadBannerFile(file, 'mobile');
                        if (res) {
                          handleUpdateCurrent({ mobileImageUrl: res.url });
                          showToast('Mobile banner uploaded successfully!');
                        }
                      } catch (err: any) {
                        showToast(err.message || 'Mobile banner upload failed', 'error');
                      } finally {
                        setUploadingMobile(false);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingMobile}
                  onClick={() => mobileFileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#173B75] hover:bg-[#112d5a] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-[#F07822]" />
                  <span>{uploadingMobile ? 'Uploading...' : 'Upload'}</span>
                </button>
                {currentConfig.mobileImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateCurrent({ mobileImageUrl: '' });
                      setRatioWarningMobile(null);
                    }}
                    className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Remove mobile banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. INDEPENDENT CTA REDIRECT SETTINGS */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E8ED] shadow-xs space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#173B75] flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#F07822]" />
                <span>Banner Click & CTA Destination</span>
              </h4>
              <p className="text-[11px] text-[#252A34]/70 mt-0.5">
                Configure what happens when a visitor clicks anywhere on this banner. The CTA graphic is already embedded in your uploaded design, so no second button will be rendered.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#173B75] mb-1">
                  Primary Destination
                </label>
                <select
                  value={currentConfig.ctaType || 'enquiry'}
                  onChange={e => handleUpdateCurrent({ ctaType: e.target.value as BannerCtaDestination })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E6E8ED] bg-white font-semibold text-[#173B75]"
                >
                  <option value="enquiry">Enquiry Form — Opens the website's Let's Talk brief modal</option>
                  <option value="call">Direct Call — Dials studio phone number (tel:)</option>
                  <option value="whatsapp">WhatsApp — Opens studio WhatsApp chat</option>
                  <option value="url">Custom Destination URL — Link to specific page or campaign</option>
                  <option value="none">No CTA — Banner is non-clickable</option>
                </select>
              </div>

              {currentConfig.ctaType === 'url' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#173B75] mb-1">
                    Destination URL
                  </label>
                  <input
                    type="text"
                    value={currentConfig.ctaUrl || ''}
                    onChange={e => handleUpdateCurrent({ ctaUrl: e.target.value })}
                    placeholder="e.g. /portfolio or https://example.com/campaign"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E6E8ED] bg-white focus:outline-none focus:ring-1 focus:ring-[#F07822]"
                  />
                </div>
              )}

              {/* Optional Separate Mobile CTA */}
              <div className="pt-3 border-t border-[#E6E8ED]">
                <label className="flex items-center gap-2 text-xs font-bold text-[#173B75] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSeparateMobileCta || Boolean(currentConfig.mobileCtaType && currentConfig.mobileCtaType !== currentConfig.ctaType)}
                    onChange={e => {
                      setShowSeparateMobileCta(e.target.checked);
                      if (!e.target.checked) {
                        handleUpdateCurrent({
                          mobileCtaType: currentConfig.ctaType,
                          mobileCtaUrl: currentConfig.ctaUrl
                        });
                      }
                    }}
                    className="rounded text-[#F07822] focus:ring-[#F07822]"
                  />
                  <span>Configure different CTA destination for mobile devices</span>
                </label>

                {(showSeparateMobileCta || Boolean(currentConfig.mobileCtaType && currentConfig.mobileCtaType !== currentConfig.ctaType)) && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E6E8ED] space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#173B75] mb-1">
                        Mobile-Only Destination
                      </label>
                      <select
                        value={currentConfig.mobileCtaType || currentConfig.ctaType || 'whatsapp'}
                        onChange={e => handleUpdateCurrent({ mobileCtaType: e.target.value as BannerCtaDestination })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E6E8ED] bg-white font-semibold text-[#173B75]"
                      >
                        <option value="whatsapp">WhatsApp (Recommended for mobile users)</option>
                        <option value="call">Direct Call (tel:)</option>
                        <option value="enquiry">Enquiry Form</option>
                        <option value="url">Custom Destination URL</option>
                        <option value="none">No CTA</option>
                      </select>
                    </div>

                    {currentConfig.mobileCtaType === 'url' && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#173B75] mb-1">
                          Mobile Destination URL
                        </label>
                        <input
                          type="text"
                          value={currentConfig.mobileCtaUrl || ''}
                          onChange={e => handleUpdateCurrent({ mobileCtaUrl: e.target.value })}
                          placeholder="/contact or https://..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E6E8ED] bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE DEVICE PREVIEW (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-[#E6E8ED] shadow-xs sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#173B75] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#F07822]" />
                <span>Live Banner Preview</span>
              </span>

              {/* Device Toggle */}
              <div className="flex items-center bg-[#F7F7F5] p-1 rounded-xl border border-[#E6E8ED]">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    previewDevice === 'desktop'
                      ? 'bg-white text-[#173B75] shadow-xs'
                      : 'text-[#242832]/60 hover:text-[#173B75]'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    previewDevice === 'mobile'
                      ? 'bg-white text-[#173B75] shadow-xs'
                      : 'text-[#242832]/60 hover:text-[#173B75]'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Display Mockup Frame */}
            <div className="rounded-2xl border border-[#E6E8ED] bg-[#0A1628] p-3 text-center overflow-hidden">
              {previewDevice === 'desktop' ? (
                <div>
                  <div className="text-[10px] text-white/50 mb-1.5 font-mono">
                    Desktop Viewport (1920 × 600 px aspect)
                  </div>
                  {currentConfig.desktopImageUrl ? (
                    <div className="relative rounded-xl overflow-hidden aspect-[16/5] bg-black">
                      <img
                        src={currentConfig.desktopImageUrl}
                        alt="Desktop Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white">
                        CTA: {currentConfig.ctaType}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl border border-dashed border-white/20 text-white/50 text-xs">
                      No desktop banner uploaded yet. Website will show default page hero.
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[220px] mx-auto">
                  <div className="text-[10px] text-white/50 mb-1.5 font-mono">
                    Mobile Viewport (750 × 1000 px aspect)
                  </div>
                  {(currentConfig.mobileImageUrl || currentConfig.desktopImageUrl) ? (
                    <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black">
                      <img
                        src={currentConfig.mobileImageUrl || currentConfig.desktopImageUrl}
                        alt="Mobile Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white">
                        CTA: {currentConfig.mobileCtaType || currentConfig.ctaType}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl border border-dashed border-white/20 text-white/50 text-xs">
                      No mobile banner uploaded. Desktop banner will be used responsively.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 text-[11px] text-[#242832]/70 leading-relaxed border-t border-[#E6E8ED]">
              <strong>Public website behavior:</strong> When a custom banner is saved, all text overlays, headings, and generated CTA buttons are hidden for this page, displaying purely your artwork with an active click area pointing to{' '}
              <span className="font-bold text-[#F07822]">
                {currentConfig.ctaType === 'enquiry'
                  ? 'Enquiry Brief Form'
                  : currentConfig.ctaType === 'call'
                  ? 'Direct Phone Call'
                  : currentConfig.ctaType === 'whatsapp'
                  ? 'WhatsApp Chat'
                  : currentConfig.ctaType === 'url'
                  ? currentConfig.ctaUrl || 'Custom URL'
                  : 'No Action'}
              </span>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
