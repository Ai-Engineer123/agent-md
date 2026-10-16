import React from 'react';

export const renderCompanyBadge = (company) => {
  const c = (company || '').toUpperCase();

  // VFMS: Blue, Green, Orange, Red, White
  if (c === 'VFMS' || c === 'VFM') {
    return (
      <span className="company-brand-badge vfm" title="Vipras Facility Management Solutions">
        <span className="brand-name-vfm">VFMS</span>
      </span>
    );
  }

  // VTS: Blue
  if (c === 'VTS') {
    return (
      <span className="company-brand-badge vts" title="Vipras Tech Solutions">
        <span className="brand-name-vts">VTS</span>
      </span>
    );
  }

  // CC: Red
  if (c === 'CC') {
    return (
      <span className="company-brand-badge cc" title="City Coolies">
        <span className="brand-name-cc">CC</span>
      </span>
    );
  }

  // PROFOX: Orange and Dark Blue
  if (c === 'PROFOX') {
    return (
      <span className="company-brand-badge profox" title="Profox">
        <span className="brand-name-profox">PROFOX</span>
      </span>
    );
  }

  return <span className="company-brand-badge default">{company}</span>;
};
