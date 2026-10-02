import assert from 'node:assert/strict';
import test from 'node:test';
import type { DcaConfigurationOrderModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import {
  calculateDcaTriggerPrice,
  calculateDcaTriggerLevels,
  evaluateDcaLevels,
} from './dcaTriggerPriceCalculator';

const order = (level: number, dropPercent: string): DcaConfigurationOrderModel => ({
  id: `config-order-${level}`,
  dcaOrderId: `dca-${level}`,
  level,
  dropPercent,
});

test('calculates a DCA trigger price from the initial entry price', () => {
  assert.equal(calculateDcaTriggerPrice('100', '5'), '95');
  assert.equal(calculateDcaTriggerPrice('100.50', '10'), '90.45');
  assert.equal(calculateDcaTriggerPrice('0.001', '50'), '0.0005');
});

test('calculates ordered DCA trigger levels', () => {
  const levels = calculateDcaTriggerLevels('100', [
    order(3, '15'),
    order(1, '5'),
    order(2, '10'),
  ]);

  assert.deepEqual(levels, [
    { level: 1, dcaOrderId: 'dca-1', dropPercent: '5', triggerPrice: '95' },
    { level: 2, dcaOrderId: 'dca-2', dropPercent: '10', triggerPrice: '90' },
    { level: 3, dcaOrderId: 'dca-3', dropPercent: '15', triggerPrice: '85' },
  ]);
});

test('marks a DCA level reached when current price is at or below trigger price', () => {
  const levels = calculateDcaTriggerLevels('100', [
    order(1, '5'),
    order(2, '10'),
  ]);

  assert.deepEqual(
    evaluateDcaLevels('95', levels).map((level) => level.reached),
    [true, false],
  );

  assert.deepEqual(
    evaluateDcaLevels('90', levels).map((level) => level.reached),
    [true, true],
  );

  assert.deepEqual(
    evaluateDcaLevels('96', levels).map((level) => level.reached),
    [false, false],
  );
});

test('rejects a DCA drop of 100 percent or more', () => {
  assert.throws(
    () => calculateDcaTriggerPrice('100', '100'),
    /DCA drop percentage must be less than 100/,
  );
});
