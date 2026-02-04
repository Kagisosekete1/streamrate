import { motion } from "framer-motion";
import { 
  X, 
  FileText, 
  User, 
  Shield, 
  Scale, 
  AlertTriangle, 
  Ban, 
  Copyright, 
  Gavel,
  Globe,
  Mail,
  CheckCircle,
  XCircle
} from "lucide-react";

interface TermsOfServiceModalProps {
  onClose: () => void;
}

const CONTACT_EMAIL = "seketefilmstv@gmail.com";

const TERMS_SECTIONS = [
  {
    icon: CheckCircle,
    title: "Acceptance of Terms",
    content: `By accessing or using StreamRate ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.

These Terms constitute a legally binding agreement between you and StreamRate. We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.

You must be at least 13 years old (or the minimum age in your jurisdiction) to use StreamRate. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf.`
  },
  {
    icon: User,
    title: "Account Registration & Responsibility",
    content: `When you create a StreamRate account, you agree to:

• Provide accurate, current, and complete information during registration
• Maintain and promptly update your account information to keep it accurate
• Maintain the security and confidentiality of your password
• Accept responsibility for all activities that occur under your account
• Immediately notify StreamRate of any unauthorized use of your account

You may not:
• Create accounts using automated methods or false information
• Share your account credentials with others
• Use another person's account without permission
• Sell, transfer, or assign your account to any third party

StreamRate reserves the right to suspend or terminate accounts that violate these Terms or for any other reason at our sole discretion.`
  },
  {
    icon: FileText,
    title: "User-Generated Content",
    content: `StreamRate allows you to create, post, and share content including text, images, videos, ratings, reviews, and comments ("User Content"). You retain ownership of your User Content, but by posting it on StreamRate, you grant us:

• A worldwide, non-exclusive, royalty-free, transferable license to use, reproduce, modify, adapt, publish, translate, distribute, and display your User Content in connection with the Service
• The right to sublicense these rights to our service providers and partners
• The right to use your username and profile information in connection with your User Content

You represent and warrant that:
• You own or have the necessary rights to your User Content
• Your User Content does not infringe any third-party rights
• Your User Content complies with all applicable laws and our Community Guidelines

StreamRate does not claim ownership of your User Content but needs these licenses to operate and improve the Service.`
  },
  {
    icon: Ban,
    title: "Prohibited Conduct",
    content: `You agree NOT to:

• Post content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable
• Impersonate any person or entity, or falsely claim an affiliation
• Post spam, chain letters, pyramid schemes, or unsolicited advertising
• Collect or harvest user information without consent
• Interfere with or disrupt the Service or servers/networks connected to it
• Use bots, scripts, or automated methods to access the Service
• Attempt to gain unauthorized access to any accounts, systems, or networks
• Manipulate ratings, reviews, or engagement metrics through fake accounts or coordinated behavior
• Violate any applicable local, state, national, or international law
• Encourage or enable any other person to do any of the above

Violation of these prohibitions may result in immediate account termination and may expose you to civil and criminal liability.`
  },
  {
    icon: Scale,
    title: "Ratings, Reviews & Fair Use",
    content: `StreamRate's rating and review system is built on authenticity and trust. When providing ratings and reviews:

• Base your ratings on genuine experience with the streamer's content
• Provide honest, constructive, and fair feedback
• Do not exchange ratings for compensation, favors, or reciprocal ratings
• Do not create multiple accounts to manipulate ratings
• Do not coordinate with others to artificially inflate or deflate ratings

StreamRate reserves the right to:
• Remove ratings or reviews that violate these Terms or our Community Guidelines
• Adjust rating calculations to account for manipulation attempts
• Suspend or terminate accounts engaged in rating fraud
• Report fraudulent activity to relevant authorities

Streamers may not retaliate against users for honest ratings or reviews. Doing so may result in account action.`
  },
  {
    icon: Copyright,
    title: "Intellectual Property Rights",
    content: `StreamRate and its content, features, and functionality are owned by StreamRate and its licensors and are protected by copyright, trademark, and other intellectual property laws.

The StreamRate name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of StreamRate. You may not use such marks without our prior written permission.

If you believe content on StreamRate infringes your copyright, please contact us at ${CONTACT_EMAIL} with:
• Identification of the copyrighted work claimed to be infringed
• Identification of the allegedly infringing material
• Your contact information
• A statement that you have a good faith belief the use is not authorized
• A statement, under penalty of perjury, that the information is accurate and you are authorized to act on behalf of the copyright owner

We will respond to valid notices and may remove infringing content and terminate repeat infringers.`
  },
  {
    icon: Shield,
    title: "Privacy & Data Protection",
    content: `Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. By using StreamRate, you agree to our Privacy Policy.

Key points:
• We collect information you provide and usage data to operate the Service
• We do not sell your personal information to third parties
• You control your privacy settings and can delete your account at any time
• We implement security measures to protect your data

Please review our full Privacy Policy for detailed information about our data practices.`
  },
  {
    icon: XCircle,
    title: "Disclaimers & Limitations",
    content: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

StreamRate does not warrant that:
• The Service will be uninterrupted, secure, or error-free
• The results obtained from the Service will be accurate or reliable
• Any content or materials available through the Service are free of viruses or harmful components

TO THE MAXIMUM EXTENT PERMITTED BY LAW, STREAMRATE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
• Your use or inability to use the Service
• Any unauthorized access to or use of your account
• Any content or conduct of any third party on the Service
• Any content obtained from the Service

OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US, IF ANY, IN THE PAST 12 MONTHS.`
  },
  {
    icon: Gavel,
    title: "Indemnification",
    content: `You agree to indemnify, defend, and hold harmless StreamRate, its affiliates, officers, directors, employees, agents, and licensors from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to:

• Your use of the Service
• Your User Content
• Your violation of these Terms
• Your violation of any rights of another party
• Your violation of any applicable laws

We reserve the right to assume the exclusive defense and control of any matter subject to indemnification, and you agree to cooperate with our defense of such claims.`
  },
  {
    icon: Globe,
    title: "Governing Law & Dispute Resolution",
    content: `These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.

Any dispute arising from these Terms or the Service shall first be attempted to be resolved through informal negotiation. If the dispute cannot be resolved informally, you agree to resolve it through binding arbitration or in the courts of the applicable jurisdiction.

You agree that any claim or cause of action arising out of or related to the Service or these Terms must be filed within one (1) year after such claim or cause of action arose, or be forever barred.

Class Action Waiver: You agree that any proceedings to resolve disputes will be conducted only on an individual basis and not in a class, consolidated, or representative action.`
  },
  {
    icon: AlertTriangle,
    title: "Termination",
    content: `StreamRate may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including:

• Breach of these Terms
• Violation of our Community Guidelines
• Upon request by law enforcement or government agencies
• Extended periods of inactivity
• Technical or security issues
• Conduct we believe is harmful to other users, third parties, or StreamRate

Upon termination:
• Your right to use the Service will immediately cease
• Your account and access to User Content may be disabled
• We may delete your User Content at our discretion
• Provisions of these Terms that by their nature should survive will remain in effect

You may terminate your account at any time through Settings > Delete Account.`
  }
];

export const TermsOfServiceModal = ({ onClose }: TermsOfServiceModalProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Terms of Service</h2>
            <p className="text-xs text-muted-foreground mt-1">Legal agreement for using StreamRate</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Introduction */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Scale className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-2">Legal Agreement</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  These Terms of Service ("Terms") govern your access to and use of StreamRate. 
                  Please read these Terms carefully before using our platform. By creating an account 
                  or using StreamRate, you acknowledge that you have read, understood, and agree to 
                  be bound by these Terms.
                </p>
              </div>
            </div>
          </div>

          {/* Effective Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>Effective Date: January 1, 2025 • Last Updated: January 2025</span>
          </div>

          {/* Terms Sections */}
          <div className="space-y-6">
            {TERMS_SECTIONS.map((section, index) => (
              <div key={index} className="p-4 bg-secondary/50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pl-13 ml-5">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Contact Us</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <p className="text-sm">
              <strong className="text-foreground">Email:</strong>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border">
            <p className="text-center text-xs text-muted-foreground">
              By using StreamRate, you acknowledge that you have read, understood, and agree to 
              these Terms of Service and our Privacy Policy. If you do not agree to these Terms, 
              please do not use StreamRate.
            </p>
            <p className="text-center text-xs text-muted-foreground mt-2">
              © 2025 StreamRate. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
