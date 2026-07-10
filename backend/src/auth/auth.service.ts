import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle.module';
import { users } from '../db/schema';
import { JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });
    if (existing) {
      throw new ConflictException('An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [user] = await this.db
      .insert(users)
      .values({
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        role: dto.role ?? 'customer',
      })
      .returning();

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  /** Signs a token and returns it alongside the public user profile. */
  private buildAuthResponse(user: typeof users.$inferSelect) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
