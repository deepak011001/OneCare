/** Extension point for future MFA (SMS, authenticator, FIDO2, passkeys). */
export type AuthFactor = 'entra' | 'development' | 'sms' | 'authenticator' | 'fido2' | 'passkey';

export interface MfaChallengePort {
  isRequired(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly riskSignals?: Readonly<Record<string, unknown>>;
  }): Promise<boolean>;

  /** Reserved — implementations land in a later milestone. */
  startChallenge?(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly factor: AuthFactor;
  }): Promise<{ challengeId: string }>;
}

export class NoOpMfaChallengePort implements MfaChallengePort {
  async isRequired(): Promise<boolean> {
    return false;
  }
}
