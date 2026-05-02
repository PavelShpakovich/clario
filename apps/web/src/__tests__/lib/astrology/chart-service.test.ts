jest.mock('@/lib/astrology/repository', () => ({
  createChartRecord: jest.fn(),
  getChartWithBirthData: jest.fn(),
  markChartFailed: jest.fn(),
  markOnboardingComplete: jest.fn(),
  saveChartSnapshot: jest.fn(),
}));

jest.mock('@/lib/astrology/engine', () => ({
  calculateNatalChart: jest.fn(),
}));

import { calculateNatalChart } from '@/lib/astrology/engine';
import { getChartWithBirthData, saveChartSnapshot } from '@/lib/astrology/repository';
import { recalculateChart } from '@/lib/astrology/chart-service';

describe('recalculateChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recreates natal chart snapshots from the updated stored birth data', async () => {
    (getChartWithBirthData as jest.Mock).mockResolvedValue({
      id: 'chart-1',
      label: 'Updated natal chart',
      person_name: 'Jane Doe',
      subject_type: 'self',
      birth_date: '1990-06-21',
      birth_time: '16:45',
      birth_time_known: true,
      house_system: 'placidus',
      notes: null,
      city: 'Минск',
      country: 'Беларусь',
      latitude: 53.9045,
      longitude: 27.5615,
      timezone: 'Europe/Minsk',
    });
    (calculateNatalChart as jest.Mock).mockResolvedValue({
      positions: [{ bodyKey: 'sun' }],
      aspects: [{ aspectKey: 'trine' }],
      warnings: [],
    });
    (saveChartSnapshot as jest.Mock).mockResolvedValue({
      id: 'snapshot-2',
      snapshot_version: 2,
    });

    const result = await recalculateChart('chart-1', 'user-123');

    expect(calculateNatalChart).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDate: '1990-06-21',
        birthTime: '16:45',
        timezone: 'Europe/Minsk',
        latitude: 53.9045,
        longitude: 27.5615,
      }),
    );
    expect(saveChartSnapshot).toHaveBeenCalledWith(
      'chart-1',
      expect.objectContaining({
        positions: [{ bodyKey: 'sun' }],
        aspects: [{ aspectKey: 'trine' }],
      }),
    );
    expect(result).toEqual({
      snapshot: { id: 'snapshot-2', snapshot_version: 2 },
      positionCount: 1,
      aspectCount: 1,
      warnings: [],
    });
  });
});
