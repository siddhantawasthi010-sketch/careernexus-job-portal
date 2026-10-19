import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { EmailService } from '../email/email.service';
import { CourseRecord, DatabaseService, LibraryTopicRecord, UserRole } from '../database/database.service';
import { getRelatedLearningSkills, jobLearningCatalog } from '../jobs/job-learning-catalog';

const normalizeSkill = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const profileSkills = (profile: Record<string, unknown>) => {
  const skills = Array.isArray(profile.skills)
    ? profile.skills
    : typeof profile.skills === 'string' ? profile.skills.split(',') : [];
  const employmentSkills = Array.isArray(profile.employmentDetails)
    ? profile.employmentDetails.flatMap((entry) => {
      if (!entry || typeof entry !== 'object' || !('skills' in entry)) return [];
      const value = entry.skills;
      return Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
    })
    : [];

  return [...skills, ...employmentSkills]
    .filter((skill): skill is string => typeof skill === 'string' && Boolean(skill.trim()))
    .map((skill) => skill.trim())
    .filter((skill, index, allSkills) => allSkills.findIndex((item) => normalizeSkill(item) === normalizeSkill(skill)) === index);
};

const topicForSkill = (skill: string): Omit<LibraryTopicRecord, 'id'> => {
  const normalizedSkill = normalizeSkill(skill);
  const catalogEntry = jobLearningCatalog.find((entry) => (
    normalizeSkill(entry.name) === normalizedSkill
    || entry.matchers.some((matcher) => normalizeSkill(matcher) === normalizedSkill)
  ));

  if (catalogEntry) {
    return {
      name: catalogEntry.name,
      briefDescription: catalogEntry.briefDescription,
      explanation: `${catalogEntry.explanation}\n\nA complete learning path should connect the concepts below to one working deliverable. Begin with the smallest useful requirement, build a working version, validate normal and failure cases, then document how it is run and maintained.`,
      subtopics: catalogEntry.subtopics || [
        `${catalogEntry.name} fundamentals, terminology, and core purpose`,
        `Architecture, components, and how ${catalogEntry.name} fits into an application`,
        'Inputs, outputs, data formats, and integration boundaries',
        'Common errors, validation, security, and recovery',
        'Testing, performance, observability, and maintainability',
        'Deployment, versioning, and operational support',
      ],
      realWorldFlow: catalogEntry.realWorldFlow || `Real-world example: a product team needs to deliver a user-facing feature that depends on ${catalogEntry.name}. First clarify the user outcome and acceptance criteria. Design the smallest component or service boundary that uses ${catalogEntry.name}; implement it with validated inputs and explicit error handling; connect it to the real data/API boundary; test success, invalid input, and dependency failure; deploy to a staging environment; and monitor logs, latency, and user-visible results before release.`,
      example: catalogEntry.example,
    };
  }

  return {
    name: skill,
    briefDescription: `${skill} is a professional skill. This guide provides a structured path from its core concepts to a tested, end-to-end implementation.`,
    explanation: `${skill} was listed in your profile but is not yet in the curated topic catalog. Start by identifying the specific tools, version, and expected outcome used in your role; the same skill name can refer to different implementations. Learn the core terminology and supported interfaces from the official documentation, then build the small workflow below and replace its integration points with the actual ${skill} APIs and conventions. Verify behavior with realistic data and document limitations rather than treating this starter guide as vendor-specific reference documentation.`,
    subtopics: [
      `${skill} fundamentals, terminology, supported versions, and setup`,
      'Core components, configuration, and the data or control flow',
      'Inputs, outputs, interfaces, and integration with the surrounding system',
      'Validation, permissions, security, errors, and recovery',
      'Unit, integration, and end-to-end testing with realistic data',
      'Deployment, monitoring, performance, and maintenance',
    ],
    realWorldFlow: `Real-world example: a team must deliver a small production feature using ${skill}. Agree on the user outcome and acceptance criteria; confirm the runtime, version, and trusted documentation; prepare an isolated development environment; implement the smallest end-to-end path from validated input through ${skill} to a visible or persisted result; handle expected failures; test normal, boundary, and dependency-error cases; deploy to staging; and review logs and results with a stakeholder before release.`,
    example: `// End-to-end implementation checklist for ${skill}\n// 1. Validate the real input and reject invalid data.\n// 2. Configure and call the documented ${skill} interface.\n// 3. Handle success, timeout, and service errors.\n// 4. Persist or display the result only after validation.\n// 5. Add tests for success, invalid input, and dependency failure.\n// Replace this checklist with executable code from the official ${skill} SDK/runtime.`,
  };
};

const courseSearchesForSkill = (skill: string): Omit<CourseRecord, 'id'>[] => [
  {
    title: `${skill} courses on Coursera`,
    topic: skill,
    provider: 'Coursera',
    level: 'All levels',
    duration: 'Self-paced',
    url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`,
  },
  {
    title: `${skill} courses on Udemy`,
    topic: skill,
    provider: 'Udemy',
    level: 'All levels',
    duration: 'Self-paced',
    url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}`,
  },
];

@Injectable()
export class AuthService {
  private readonly otpLifetimeMs = 5 * 60 * 1000;
  private readonly resendCooldownMs = 30 * 1000;

  constructor(
    private readonly emailService: EmailService,
    private readonly databaseService: DatabaseService,
  ) {}

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async buildUserForEmail(email: string, requestedRole: UserRole) {
    const existingUser = await this.databaseService.getUserByEmail(email);
    if (existingUser) {
      if (existingUser.role === requestedRole) return existingUser;
      await this.databaseService.updateUserRole(email, requestedRole);
      return { ...existingUser, role: requestedRole };
    }

    const firstName = email.split('@')[0].replace(/[._-]/g, ' ');
    const name = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'New User';

    return this.databaseService.upsertUser({ email, name, role: requestedRole });
  }

  async sendOtp(email: string, role?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new UnauthorizedException('Please enter a valid email address.');
    }

    const existingOtp = await this.databaseService.getLatestOtp(normalizedEmail);
    const sentAt = existingOtp ? new Date(existingOtp.sent_at).getTime() : 0;
    if (existingOtp && Date.now() - sentAt < this.resendCooldownMs) {
      const remainingSeconds = Math.ceil((this.resendCooldownMs - (Date.now() - sentAt)) / 1000);
      throw new UnauthorizedException(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
    }

    const otp = this.generateOtp();
    const selectedRole: UserRole = role === 'recruiter' ? 'recruiter' : 'candidate';
    const user = await this.databaseService.getUserByEmail(normalizedEmail);

    await this.databaseService.createOtp({
      email: normalizedEmail,
      otp_hash: this.hashOtp(otp),
      role: selectedRole,
      expires_at: new Date(Date.now() + this.otpLifetimeMs).toISOString(),
      sent_at: new Date().toISOString(),
    });

    try {
      await this.emailService.sendOtpEmail(normalizedEmail, otp, selectedRole);
    } catch (error) {
      await this.databaseService.deleteOtps(normalizedEmail);
      throw new InternalServerErrorException('Unable to send OTP email. Please try again later.');
    }

    return {
      message: 'OTP sent to your email successfully.',
      email: normalizedEmail,
      expiresInSeconds: Math.floor(this.otpLifetimeMs / 1000),
      isNewUser: !user,
      role: selectedRole,
    };
  }

  async verifyOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const otpEntry = await this.databaseService.getLatestOtp(normalizedEmail);

    if (!otpEntry) {
      throw new UnauthorizedException('No OTP was requested for this email. Please send OTP again.');
    }

    if (Date.now() > new Date(otpEntry.expires_at).getTime()) {
      await this.databaseService.deleteOtps(normalizedEmail);
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }

    if (this.hashOtp(otp.trim()) !== otpEntry.otp_hash) {
      throw new UnauthorizedException('Invalid OTP. Please enter the correct code.');
    }

    const existingUser = await this.databaseService.getUserByEmail(normalizedEmail);
    const user = await this.buildUserForEmail(normalizedEmail, otpEntry.role);
    await this.syncUserLearningContent(user.profile || {});
    await this.databaseService.deleteOtps(normalizedEmail);

    return {
      accessToken: this.createAccessToken(normalizedEmail),
      isNewUser: !existingUser,
      user,
    };
  }

  private async syncUserLearningContent(profile: Record<string, unknown>) {
    const skills = profileSkills(profile);
    const professionTerms = [
      profile.preferredJobRole,
      profile.currentJobTitle,
      profile.currentRole,
      profile.currentlyWorkingAs,
      profile.headline,
    ].filter((term): term is string => typeof term === 'string' && Boolean(term.trim()));
    const [existingTopics, existingCourses] = await Promise.all([
      this.databaseService.getLibraryTopics(),
      this.databaseService.getCourses(),
    ]);
    const topicsToAdd = new Map<string, Omit<LibraryTopicRecord, 'id'>>();
    const coursesToAdd: Omit<CourseRecord, 'id'>[] = [];
    const topicsByName = new Map(existingTopics.map((topic) => [normalizeSkill(topic.name), topic]));
    const knownCourseTopics = new Set(existingCourses.map((course) => normalizeSkill(course.topic)));

    const userTopics = new Map<string, Omit<LibraryTopicRecord, 'id'>>();
    const relatedSkills = getRelatedLearningSkills([...skills, ...professionTerms]);
    for (const skill of [...skills, ...relatedSkills.map((entry) => entry.name)]) {
      const topic = topicForSkill(skill);
      userTopics.set(normalizeSkill(topic.name), topic);
    }

    for (const [topicKey, topic] of userTopics) {
      const existingTopic = topicsByName.get(topicKey);
      if (
        !existingTopic
        || !existingTopic.subtopics?.length
        || !existingTopic.realWorldFlow?.trim()
      ) {
        topicsToAdd.set(topicKey, topic);
      }
    }

    for (const skill of skills) {
      const topic = topicForSkill(skill);
      const topicKey = normalizeSkill(topic.name);
      if (!knownCourseTopics.has(topicKey)) {
        coursesToAdd.push(...courseSearchesForSkill(topic.name));
        knownCourseTopics.add(topicKey);
      }
    }

    await this.databaseService.addMissingUserLearningContent([...topicsToAdd.values()], coursesToAdd);
  }

  createAccessToken(email: string) {
    const payload = Buffer.from(JSON.stringify({ email, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
    const signature = createHmac('sha256', this.getAccessTokenSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  getEmailFromAccessToken(token: string): string | null {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const expectedSignature = createHmac('sha256', this.getAccessTokenSecret()).update(payload).digest();
    let receivedSignature: Buffer;
    try {
      receivedSignature = Buffer.from(signature, 'base64url');
    } catch {
      return null;
    }
    if (receivedSignature.length !== expectedSignature.length || !timingSafeEqual(receivedSignature, expectedSignature)) return null;
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: unknown; expiresAt?: unknown };
      if (typeof claims.email !== 'string' || typeof claims.expiresAt !== 'number' || claims.expiresAt <= Date.now()) return null;
      return claims.email;
    } catch {
      return null;
    }
  }

  private getAccessTokenSecret() {
    const secret = process.env.AUTH_TOKEN_SECRET;
    if (secret) {
      if (secret.length < 32) {
        throw new InternalServerErrorException('AUTH_TOKEN_SECRET must contain at least 32 characters.');
      }
      return secret;
    }

    const developmentServiceKey = process.env.NODE_ENV === 'production' ? '' : process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (developmentServiceKey && developmentServiceKey.length >= 32) {
      return createHmac('sha256', developmentServiceKey).update('careernexus-auth-token-development-v1').digest('hex');
    }

    throw new InternalServerErrorException('AUTH_TOKEN_SECRET must contain at least 32 characters.');
  }

  async updateProfile(email: string, profile: Record<string, unknown>) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !profile || typeof profile !== 'object') {
      throw new UnauthorizedException('A valid email and profile are required.');
    }

    const user = await this.databaseService.updateUserProfile(normalizedEmail, profile);
    await this.syncUserLearningContent(user.profile || {});
    return { user };
  }

  async getProfile(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new UnauthorizedException('A valid email is required to load this profile.');
    const user = await this.databaseService.getUserByEmail(normalizedEmail);
    if (!user) throw new UnauthorizedException('This account could not be found. Please sign in again.');
    return { user };
  }

  async updateProfilePhoto(email: string, photo: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || typeof photo !== 'string' || !photo) {
      throw new UnauthorizedException('A valid email and profile photo are required.');
    }
    const user = await this.databaseService.updateUserProfilePhoto(normalizedEmail, photo);
    return { user };
  }

  async uploadResume(email: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    if (!email?.trim()) throw new BadRequestException('A valid email is required.');
    try {
      return await this.databaseService.uploadUserResume(email, file);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Resume')) throw new BadRequestException(error.message);
      throw error;
    }
  }

  async getResume(email: string) {
    if (!email?.trim()) throw new BadRequestException('A valid email is required.');
    return (await this.databaseService.getUserResume(email)) || { resume: null, downloadUrl: null };
  }

  async deleteResume(email: string) {
    if (!email?.trim()) throw new BadRequestException('A valid email is required.');
    return this.databaseService.deleteUserResume(email);
  }

  async resendOtp(email: string, role?: string) {
    return this.sendOtp(email, role);
  }

  private hashOtp(otp: string) {
    return createHash('sha256').update(otp).digest('hex');
  }
}
