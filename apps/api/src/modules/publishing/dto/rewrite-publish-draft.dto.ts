import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  return value;
}

const STYLE_PRESETS = [
  'CURATED_INSIGHT',
  'PRACTICAL_GUIDE',
  'TREND_COMMENTARY',
  'STORYTELLING',
  'WEEKLY_SELECTION',
] as const;
const TONE_PRESETS = [
  'PROFESSIONAL',
  'FRIENDLY',
  'SHARP',
  'CALM',
  'ENERGETIC',
] as const;
const STRUCTURE_PRESETS = [
  'OPENING_BODY_TAKEAWAYS',
  'NUMBERED_LIST',
  'QUESTION_ANSWER',
  'BULLET_DIGEST',
] as const;
const LENGTH_PRESETS = ['SHORT', 'MEDIUM', 'LONG'] as const;
const PLATFORM_STYLES = ['GENERAL', 'WECHAT', 'ZHIHU', 'CSDN'] as const;
const LEAD_STYLES = ['DIRECT', 'QUESTION', 'SCENARIO', 'HOT_TAKE'] as const;
const ENDING_STYLES = ['SUMMARY', 'CALL_TO_ACTION', 'QUESTION', 'NEXT_STEP'] as const;

export class RewritePublishDraftDto {
  @IsOptional()
  @IsString()
  modelConfigId?: string;

  @IsOptional()
  @IsIn(STYLE_PRESETS)
  stylePreset?: (typeof STYLE_PRESETS)[number];

  @IsOptional()
  @IsIn(TONE_PRESETS)
  tonePreset?: (typeof TONE_PRESETS)[number];

  @IsOptional()
  @IsIn(STRUCTURE_PRESETS)
  structurePreset?: (typeof STRUCTURE_PRESETS)[number];

  @IsOptional()
  @IsIn(LENGTH_PRESETS)
  lengthPreset?: (typeof LENGTH_PRESETS)[number];

  @IsOptional()
  @IsIn(PLATFORM_STYLES)
  platformStyle?: (typeof PLATFORM_STYLES)[number];

  @IsOptional()
  @IsIn(LEAD_STYLES)
  leadStyle?: (typeof LEAD_STYLES)[number];

  @IsOptional()
  @IsIn(ENDING_STYLES)
  endingStyle?: (typeof ENDING_STYLES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  coreMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  readerTakeaway?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  avoidPhrases?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customInstructions?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeSourceLinks?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  preserveMediaReferences?: boolean;
}
