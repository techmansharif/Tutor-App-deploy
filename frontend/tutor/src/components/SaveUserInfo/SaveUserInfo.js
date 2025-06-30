import React, { useState } from 'react';

const SaveUserInfo = ({ API_BASE_URL, onSwitchToLogin, setToken }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    parentContactNumber: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { firstName, lastName, contactNumber, parentContactNumber } = formData;

    // Validation
    if (!/^[A-Za-z]+$/.test(firstName) || !/^[A-Za-z]+$/.test(lastName)) {
      setError('Names should only contain letters.');
      return;
    }

    if (!/^\d{10}$/.test(contactNumber) || !/^\d{10}$/.test(parentContactNumber)) {
      setError('Contact numbers must be 10 digits.');
      return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/saveuserinfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          contact_number: contactNumber,
          parent_contact_number: parentContactNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }
      const data = await response.json();
      const token = data.token; // Adjust based on your API response
      localStorage.setItem('access_token', token);
      setToken(token);
      setFormData({
        firstName: '',
        lastName: '',
        contactNumber: '',
        parentContactNumber: '',
      });
    } catch (err) {
      setError('Failed to sign up. Please try again.');
      console.error('Signup error:', err);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="firstName" className="block text-gray-700 font-medium mb-2">
            Your First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="lastName" className="block text-gray-700 font-medium mb-2">
            Your Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="contactNumber" className="block text-gray-700 font-medium mb-2">
            Your Contact Number
          </label>
          <input
            type="tel"
            id="contactNumber"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            pattern="[0-9]{10}"
            placeholder="1234567890"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Enter a 10-digit phone number</p>
        </div>
        <div className="mb-6">
          <label htmlFor="parentContactNumber" className="block text-gray-700 font-medium mb-2">
            Parent's Contact Number
          </label>
          <input
            type="tel"
            id="parentContactNumber"
            name="parentContactNumber"
            value={formData.parentContactNumber}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            pattern="[0-9]{10}"
            placeholder="1234567890"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Enter a 10-digit phone number</p>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200"
        >
          Sign Up
        </button>
      </form>
      <button
        onClick={onSwitchToLogin}
        className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg mt-4 hover:bg-gray-300 transition duration-200"
      >
        Already have an account? Log In
      </button>
      {error && (
        <p className="text-red-500 text-center mt-4">{error}</p>
      )}
    </div>
  );
};

export default SaveUserInfo;