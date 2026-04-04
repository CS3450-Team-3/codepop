'use client';

export default function CustomerProfilePage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600 mb-4">Welcome to your profile! Here you can manage your personal information and preferences.</p>
        <div className="space-y-4">
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Name</span>
            <span className="text-gray-700">Guest User</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Email</span>
            <span className="text-gray-700">guest@codepop.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
