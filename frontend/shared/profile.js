const hasValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined && value !== false;
};

export const languageSuggestions = [
  'Arabic', 'Bengali', 'Chinese', 'English', 'French', 'German', 'Gujarati', 'Hindi',
  'Italian', 'Japanese', 'Kannada', 'Korean', 'Malayalam', 'Marathi', 'Nepali',
  'Odia', 'Persian', 'Portuguese', 'Punjabi', 'Russian', 'Spanish', 'Tamil', 'Telugu', 'Urdu',
];

export const noticePeriodOptions = [
  'Less than a month',
  '1 Month',
  '2 Months',
  '3 Months',
  'More than 3 months',
];

const completionRatio = (values) => values.filter(hasValue).length / values.length;

const recordCompletion = (records, getFields) => {
  const populatedRecords = records.filter((record) => Object.values(record).some(hasValue));
  if (!populatedRecords.length) return 0;
  return populatedRecords.reduce((total, record) => total + completionRatio(getFields(record)), 0) / populatedRecords.length;
};

export function calculateProfileCompletion(profile = {}) {
  const employmentDetails = Array.isArray(profile.employmentDetails) ? profile.employmentDetails : [];
  const majorProjects = Array.isArray(profile.majorProjects) ? profile.majorProjects : [];
  const sections = [
    completionRatio([
      profile.headline,
      profile.name,
      profile.contact,
      profile.education,
      profile.location,
      profile.languages,
      profile.currentlyWorkingAs,
      profile.email,
      profile.photo,
    ]),
    completionRatio([
      profile.currentIndustry,
      profile.department,
      profile.currentRole,
      profile.currentJobTitle,
      profile.noticePeriod,
      profile.dateOfBirth,
      profile.address,
    ]),
    completionRatio([
      profile.preferredJobRole,
      profile.preferredCity,
      profile.jobType,
      profile.employmentType,
      profile.preferredShift,
    ]),
    completionRatio([profile.skills]),
    recordCompletion(employmentDetails, (entry) => [
      entry.companyName,
      entry.jobTitle,
      entry.employmentType,
      entry.joiningDate,
      entry.ctc,
      entry.skills,
      entry.jobProfile,
      entry.isCurrent ? entry.noticePeriod : entry.relievingDate,
    ]),
    recordCompletion(majorProjects, (project) => [
      project.projectTitle,
      project.companyName,
      project.status,
      project.workedFrom,
      project.status === 'In progress' || project.workedTill,
      project.projectDetails,
    ]),
  ];

  return Math.round((sections.reduce((total, section) => total + section, 0) / sections.length) * 100);
}

export function formatProfileUpdatedAt(value) {
  if (!value) return 'Not updated yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not updated yet';
  return `Last updated ${new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)}`;
}