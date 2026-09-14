export interface ConstitutionArticle {
  id: string;
  articleNumber: string;
  title: string;
  hausaTitle?: string;
  sections: {
    sectionNumber: string;
    heading: string;
    content: string;
    hausaSummary?: string;
  }[];
}

export const OFFICIAL_CONSTITUTION_DATA: {
  title: string;
  hausaTitle: string;
  organization: string;
  edition: string;
  effectiveDate: string;
  preamble: string;
  hausaPreamble: string;
  articles: ConstitutionArticle[];
} = {
  title: 'Constitution and Bye-Laws of the Northern Nigeria Electrical Practitioners & Engineers Forum (N-NEPEF 2020)',
  hausaTitle: 'Kundin Tsarin Mulki da Dokokin Kungiyar Injiniyoyi da Ma’aikatan Wutar Lantarki ta Arewacin Najeriya (N-NEPEF 2020)',
  organization: 'Northern Nigeria Electrical Practitioners & Engineers Forum (N-NEPEF 2020)',
  edition: '2020 Revised Official Secretariat Edition',
  effectiveDate: '1st October 2020',
  preamble: 'WE, the professional electrical engineers, technologists, technicians, and licensed electrical installation contractors across the 19 Northern States of the Federal Republic of Nigeria and the FCT, FIRMLY AND SOLEMNLY RESOLVE to provide for ourselves a Constitution for the purpose of promoting electrical engineering excellence, safety of lives and properties, technological advancement, and professional solidarity.',
  hausaPreamble: 'MUDDIN KUNGIYAR kwararrun injiniyoyi, masana kimiyya, ma’aikata, da ’yan kwangilar shigar da wutar lantarki a jihohi 19 na Arewacin Najeriya da Birnin Tarayya Abuja, mun kuduri aniya a karkashin wannan Kundin Tsarin Mulki domin daukaka darajar aikin wutar lantarki, kare rayuka da dukiyoyi, ci gaban fasaha, da hadin kan membobin kungiya.',
  articles: [
    {
      id: 'art-1',
      articleNumber: 'ARTICLE 1',
      title: 'Name, Supremacy and Official Motto',
      hausaTitle: 'Suna, Matsayin Doka da Taken Kungiya',
      sections: [
        {
          sectionNumber: 'Section 1.1',
          heading: 'Official Name',
          content: 'The Association shall be officially known and addressed as the "Northern Nigeria Electrical Practitioners & Engineers Forum" (herein referred to as N-NEPEF 2020).',
          hausaSummary: 'Sunan wannan kungiya a hukumance shi ne "Northern Nigeria Electrical Practitioners & Engineers Forum" (N-NEPEF 2020).'
        },
        {
          sectionNumber: 'Section 1.2',
          heading: 'Supremacy of Constitution',
          content: 'This Constitution is supreme and its provisions shall have binding force on all state chapters, local government branches, executive officers, practicing members, and affiliated electrical bodies.',
          hausaSummary: 'Wannan kundin tsarin mulki shi ne babbar doka mai iko a kan dukkan rassukan jihohi, shugabanni, da membobi.'
        },
        {
          sectionNumber: 'Section 1.3',
          heading: 'Motto & Core Creed',
          content: 'The official motto of the Forum shall be: "Powering Safety, Excellence and Engineering Innovation for Northern Nigeria".',
          hausaSummary: 'Taken kungiya shi ne: "Inganta Tsaro, Kwarewa da Sabbin Dabarun Wutar Lantarki a Arewacin Najeriya".'
        }
      ]
    },
    {
      id: 'art-2',
      articleNumber: 'ARTICLE 2',
      title: 'Aims, Objectives and Mandates',
      hausaTitle: 'Manufofi, Muradu da Ayyukan Kungiya',
      sections: [
        {
          sectionNumber: 'Section 2.1',
          heading: 'Standardization of Electrical Installations',
          content: 'To regulate, monitor, and enforce high-standard electrical installation practices in residential, commercial, and industrial facilities in Northern Nigeria in strict compliance with the Nigerian Electricity Supply and Installation Standards Regulations (NESISR).',
          hausaSummary: 'Tabbatar da shigar da ingantattun kayan wutar lantarki da bin dokokin tsaro na kasa domin kare gobara da hatsari.'
        },
        {
          sectionNumber: 'Section 2.2',
          heading: 'Capacity Building & Technical Certification',
          content: 'To foster continuous professional development through regular training workshops, solar/renewable energy technology certifications, high-voltage substations management courses, and technical seminars.',
          hausaSummary: 'Horar da membobi da bayar da shaidar kwarewa a fannin hasken rana (solar), masana’antu, da na’urorin wutar lantarki na zamani.'
        },
        {
          sectionNumber: 'Section 2.3',
          heading: 'Welfare, Solidarity & Professional Protection',
          content: 'To protect the professional rights and general welfare of all registered practitioners, advocate fair labor conditions, provide emergency assistance, and liaise with DisCos, TCN, NEMSA, and regulatory authorities.',
          hausaSummary: 'Kare hakki da jin dadin membobi da hada gwiwa da hukumomin wutar lantarki kamar DisCos, TCN, da NEMSA.'
        }
      ]
    },
    {
      id: 'art-3',
      articleNumber: 'ARTICLE 3',
      title: 'Membership Categories, Admission & Verification',
      hausaTitle: 'Rukunin Membobi, Shiga Kungiya da Tantancewa',
      sections: [
        {
          sectionNumber: 'Section 3.1',
          heading: 'Categories of Membership',
          content: 'Membership of the Forum shall comprise: (a) Fellow Members (FNNEPEF), (b) Full Practicing Members, (c) Associate Members, (d) Graduate Engineers, and (e) Student / Trainee Technicians.',
          hausaSummary: 'Membobin kungiya sun hada da: Manyan Injiniyoyi (Fellow), Cikakkun Masu Aiki (Full Members), Mataimaka (Associate), da Daliban Injiniyanci.'
        },
        {
          sectionNumber: 'Section 3.2',
          heading: 'Admission & Official Verification Procedure',
          content: 'Every candidate seeking admission shall complete the official enrollment dossier, provide authentic NIN verification, upload verified educational credentials, submit proof of dues payment, and obtain Secretariat approval.',
          hausaSummary: 'Duk mai neman shiga dole ne ya cika fom a shafin intanet, ya kawo lambar NIN, shaidar karatu, da biyan kudin rajista kafin amincewa.'
        },
        {
          sectionNumber: 'Section 3.3',
          heading: 'Issuance and Validity of Smart Digital ID Card',
          content: 'Upon official approval by the Super Admin Secretariat, an approved member shall be issued an official Smart Membership ID Card containing an encrypted verification QR code, valid for twenty-four (24) calendar months from issuance.',
          hausaSummary: 'Bayan amincewa, za a bai wa memba katin shaida mai lambar sirri ta QR Code wanda ke aiki na tsawon shekaru 2 kafin sabuntawa.'
        }
      ]
    },
    {
      id: 'art-4',
      articleNumber: 'ARTICLE 4',
      title: 'Governing Organs and Administrative Hierarchy',
      hausaTitle: 'Shugabanci da Hukumar Gudanarwa',
      sections: [
        {
          sectionNumber: 'Section 4.1',
          heading: 'The National Executive Council (NEC)',
          content: 'The supreme administrative authority between General Conferences shall be vested in the National Executive Council headed by the National President, assisted by the National Vice Presidents, National General Secretary, Treasurer, Financial Secretary, and Technical Directors.',
          hausaSummary: 'Majalisar Zartarwa ta Kasa karkashin Jagorancin Shugaban Kasa ita ce mai iko mafi girma a gudanar da harkokin kungiya.'
        },
        {
          sectionNumber: 'Section 4.2',
          heading: 'State Chapter Executive Committees',
          content: 'Each of the 19 Northern States and the FCT shall maintain a State Executive Committee responsible for local membership coordination, conflict mediation, state chapter monthly dues, and local safety inspections.',
          hausaSummary: 'Kowace jiha a Arewacin Najeriya tana da shugabannin reshe da ke kula da membobin jihar da taruka.'
        },
        {
          sectionNumber: 'Section 4.3',
          heading: 'The Board of Trustees (BoT)',
          content: 'The Board of Trustees shall hold in trust all real property and permanent assets of the Forum, advise on strategic policy decisions, and mediate in constitutional disputes.',
          hausaSummary: 'Kwamitin Amintattu (BoT) shi ne ke rike da kadarori da dukiyoyin kungiya da bayar da shawarwari kan manyan manufofi.'
        }
      ]
    },
    {
      id: 'art-5',
      articleNumber: 'ARTICLE 5',
      title: 'Finances, Membership Dues, Revenue & Audit',
      hausaTitle: 'Kudaden Kungiya, Haraji, da Binciken Kudi',
      sections: [
        {
          sectionNumber: 'Section 5.1',
          heading: 'Sources of Revenue',
          content: 'The revenue of the Forum shall be generated through: (a) One-time Registration and ID Card Fees, (b) Annual Practicing Dues, (c) Training Workshop fees, (d) Voluntary donations, and (e) Technical consultancy services.',
          hausaSummary: 'Kudaden kungiya na fitowa ne daga kudin rajista da katin shaida, kudin shekara, tarukan bita, da gudummawa.'
        },
        {
          sectionNumber: 'Section 5.2',
          heading: 'Bank Accounts & Safe Custody',
          content: 'All funds of the Forum shall be deposited in approved commercial bank accounts in the name of "Northern Nigeria Electrical Practitioners & Engineers Forum". Signatories to the principal bank account shall be the National President, National Treasurer, and National Secretary.',
          hausaSummary: 'Dole ne a ajiye kudaden kungiya a asusun banki na hukuma. Masu sanya hannu sun hada da Shugaba, Sakatare, da Ma’aji.'
        },
        {
          sectionNumber: 'Section 5.3',
          heading: 'Annual Financial Audit and Reporting',
          content: 'The accounts of the Forum shall be audited annually by a reputable, independent firm of chartered accountants and published to all approved members at the Annual National Convention.',
          hausaSummary: 'Za a rika duba kudaden kungiya a kowace shekara ta hanyar kwararrun masana binciken kudi (Audit) sannan a gabatar wa membobi rahoto.'
        }
      ]
    },
    {
      id: 'art-6',
      articleNumber: 'ARTICLE 6',
      title: 'Code of Professional Conduct and Disciplinary Actions',
      hausaTitle: 'Ka’idojin Da’a, Horarwa da Ladabtarwa',
      sections: [
        {
          sectionNumber: 'Section 6.1',
          heading: 'Ethical Engineering Standards',
          content: 'Every member shall adhere strictly to electrical safety codes, never compromise on cable thickness or safety earthing, and refrain from any unauthorized electricity bypass, meter tampering, or hazardous wiring.',
          hausaSummary: 'Haramun ne ga memba ya yi aiki marar inganci, ko ya hada wutar sata, ko ya yi magudi a mitar wuta.'
        },
        {
          sectionNumber: 'Section 6.2',
          heading: 'Disciplinary Committee and Sanctions',
          content: 'Any member found guilty of gross professional misconduct, electrical vandalism, financial misappropriation, or bringing the Forum into disrepute shall face sanctions ranging from official warning, fines, suspension, to revocation of membership and blacklisting.',
          hausaSummary: 'Duk memba da ya karya ka’idojin aiki za a iya dakatar da shi, ko cire sunansa daga kungiya, ko tura shi ga hukuma.'
        }
      ]
    },
    {
      id: 'art-7',
      articleNumber: 'ARTICLE 7',
      title: 'Constitutional Amendments and Custody',
      hausaTitle: 'Gyaran Kundin Tsarin Mulki da Kula da Takardu',
      sections: [
        {
          sectionNumber: 'Section 7.1',
          heading: 'Amendment Procedure',
          content: 'This Constitution may be amended only at the Annual National General Meeting by a two-thirds (2/3) majority vote of registered delegates present, provided that notice of proposed amendment has been submitted to the Secretariat at least sixty (60) days prior.',
          hausaSummary: 'Za a iya gyara wannan kundi ne kawai a babban taron kasa idan kashi biyu cikin uku (2/3) na wakilai suka amince.'
        },
        {
          sectionNumber: 'Section 7.2',
          heading: 'Custody & Admin-Only Download Policy',
          content: 'The official digital and physical master copies of this Constitution shall remain in the exclusive custody of the Super Admin Secretariat. Public viewing and in-portal reading are freely granted to all citizens and members; direct digital master file downloads are strictly restricted to Secretariat Administrators.',
          hausaSummary: 'Cikakken asalin fayil din kundin yana hannun babban Admin na Sakatariya. Kowa na da damar dubawa da karantawa a shafin intanet, amma saukar da babban fayil (PDF download) an kebe shi ga Admin ne kadai.'
        }
      ]
    }
  ]
};
