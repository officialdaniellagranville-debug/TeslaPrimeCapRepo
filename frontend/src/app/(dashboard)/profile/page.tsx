'use client';

import { useState } from 'react';

export default function ProfilePage() {
  const [firstName, setFirstName] = useState('John');
  const [lastName, setLastName] = useState('Doe');
  const [phone, setPhone] = useState('+1 (555) 123-4567');
  const [country, setCountry] = useState('United States');
  const [address, setAddress] = useState('123 Main Street');
  const [city, setCity] = useState('New York');
  const [state, setState] = useState('NY');
  const [zip, setZip] = useState('10001');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [twoFactor, setTwoFactor] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [withdrawalNotif, setWithdrawalNotif] = useState(true);
  const [investmentNotif, setInvestmentNotif] = useState(false);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
          <p className="text-tesla-gray-400 text-sm mt-1">Manage your personal information and security settings.</p>
        </div>
        {saved && (
          <span className="text-green-400 text-sm font-medium">Changes saved successfully.</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 space-y-5">
          <h3 className="text-sm font-medium text-white tracking-wide uppercase">Personal Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              value="john@example.com"
              readOnly
              className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-tesla-gray-500 px-4 py-3 text-sm rounded-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm appearance-none"
            >
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Canada</option>
              <option>Australia</option>
              <option>Germany</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Zip</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm"
              />
            </div>
          </div>
        </div>

        {/* Security & Notifications */}
        <div className="space-y-6">
          {/* Security */}
          <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 space-y-5">
            <h3 className="text-sm font-medium text-white tracking-wide uppercase">Security</h3>

            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
                />
              </div>
            </div>

            {/* Two-Factor Auth */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-sm text-white">Two-Factor Authentication</div>
                <div className="text-xs text-tesla-gray-500 mt-0.5">Add an extra layer of security</div>
              </div>
              <button
                onClick={() => setTwoFactor(!twoFactor)}
                className={`relative w-11 h-6 transition-colors rounded-sm ${
                  twoFactor ? 'bg-tesla-red' : 'bg-tesla-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white transition-transform rounded-sm ${
                    twoFactor ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 space-y-4">
            <h3 className="text-sm font-medium text-white tracking-wide uppercase">Notification Preferences</h3>

            {[
              { label: 'Email Notifications', desc: 'Receive updates via email', value: emailNotif, setter: setEmailNotif },
              { label: 'Withdrawal Alerts', desc: 'Get notified about withdrawals', value: withdrawalNotif, setter: setWithdrawalNotif },
              { label: 'Investment Updates', desc: 'Daily earning notifications', value: investmentNotif, setter: setInvestmentNotif },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{item.label}</div>
                  <div className="text-xs text-tesla-gray-500">{item.desc}</div>
                </div>
                <button
                  onClick={() => item.setter(!item.value)}
                  className={`relative w-11 h-6 transition-colors rounded-sm flex-shrink-0 ml-4 ${
                    item.value ? 'bg-tesla-red' : 'bg-tesla-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white transition-transform rounded-sm ${
                      item.value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <button onClick={handleSave} className="btn-tesla bg-tesla-red text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm">
          Save Changes
        </button>
        <button className="text-tesla-red text-sm hover:underline">
          Delete Account
        </button>
      </div>
    </div>
  );
}
