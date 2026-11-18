import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'xiaoming', description: '4~32 位字母、数字或下划线' })
  @Matches(/^[a-zA-Z0-9_]{4,32}$/, { message: '用户名为 4~32 位字母、数字或下划线' })
  username: string;

  @ApiProperty({ example: 'Passw0rd!', description: '8~64 位，需同时包含字母和数字' })
  @Length(8, 64, { message: '密码长度为 8~64 位' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: '密码需同时包含字母和数字' })
  password: string;

  @ApiProperty({ example: '小明', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  nickname?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'xiaoming' })
  @IsString()
  @Length(1, 32)
  username: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @Length(1, 64)
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
