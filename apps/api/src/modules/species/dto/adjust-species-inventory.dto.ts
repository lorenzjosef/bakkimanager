import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';
import type { AdjustSpeciesInventoryRequest, InventoryAdjustmentReason } from '@bakki/domain';

const INVENTORY_ADJUSTMENT_REASONS: InventoryAdjustmentReason[] = [
  'adjustment',
  'correction',
  'planting',
  'monitoring',
  'fertilizing',
];

export class AdjustSpeciesInventoryDto implements AdjustSpeciesInventoryRequest {
  @Type(() => Number)
  @IsNumber()
  @NotEquals(0)
  quantityDelta!: number;

  @IsString()
  @IsIn(INVENTORY_ADJUSTMENT_REASONS)
  reason!: InventoryAdjustmentReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
