import React from "react";
import PharmacyRegistrationWizard from "./PharmacyRegistrationWizard";

interface ProfileSetupProps {
  phone: string;
  onSetupComplete: () => void;
  onBack?: () => void;
}

export default function ProfileSetup({ phone, onSetupComplete, onBack }: ProfileSetupProps) {
  return (
    <div className="w-full h-full bg-slate-100 flex flex-col justify-center items-center p-4 overflow-y-auto">
      <PharmacyRegistrationWizard
        initialPhone={phone}
        onComplete={() => onSetupComplete()}
        onCancel={onBack}
      />
    </div>
  );
}
