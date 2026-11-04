import { MONTHS } from './fixtures/clients'
import type { ClientsResponse } from './generated/model'

const same = (value: number): number[] => MONTHS.map(() => value)

// Small hand-made response for tests. Every total equals the sum of its children,
// so a test that needs a data issue adds it explicitly. Shape like the delivered
// data: a leaf branch, an advisor with channels (incl. one not in the delivered
// data), an advisor without channels.
export const exampleResponse = {
    months: MONTHS,
    company: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Example Co',
        values: same(30),
        branches: [
            {
                id: '00000000-0000-4000-8000-000000000002',
                name: 'North',
                values: same(20),
                employees: [
                    {
                        id: '00000000-0000-4000-8000-000000000003',
                        name: 'Ada Lovelace',
                        values: same(12),
                        channels: [
                            {
                                id: '00000000-0000-4000-8000-000000000004',
                                name: 'Existing clients',
                                values: same(10),
                            },
                            {
                                id: '00000000-0000-4000-8000-000000000005',
                                name: 'Referral',
                                values: same(2),
                            },
                        ],
                    },
                    {
                        id: '00000000-0000-4000-8000-000000000006',
                        name: 'Grace Hopper',
                        values: same(8),
                    },
                ],
            },
            {
                id: '00000000-0000-4000-8000-000000000007',
                name: 'South',
                values: same(10),
            },
        ],
    },
} satisfies ClientsResponse
