// import dayjs from 'dayjs'
import { prisma } from '@/src/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const username = String(req.query.username)
  const { year, month } = req.query

  if (!year || !month) {
    return res.status(400).json({ message: 'Year or month not specified.' })
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  })

  if (!user) {
    return res.status(400).json({ message: 'User does not exist.' })
  }

  const avaliableWeekDays = await prisma.userTimeInterval.findMany({
    select: {
      week_day: true,
    },
    where: {
      user_id: user.id,
    },
  })

  const blockedWeekDays = [0, 1, 2, 3, 4, 5, 6].filter((weekDay) => {
    return !avaliableWeekDays.some(
      (avaliableWeekDay) => avaliableWeekDay.week_day === weekDay,
    )
  })

  const blockedDatesRaw: Array<{ date: number }> = await prisma.$queryRaw`
    SELECT 
      EXTRACT(DAY FROM schedulings.date) AS date, 
      COUNT(schedulings.date) AS amount

    FROM schedulings

    WHERE schedulings.user_id = ${user.id}
      AND EXTRACT(YEAR from schedulings.date) = ${year}
      AND EXTRACT(MONTH from schedulings.date) = ${month}

    GROUP BY EXTRACT(DAY from schedulings.date)

  `

  const blockedDates = blockedDatesRaw.map((item) => item.date)

  return res.json({ blockedWeekDays, blockedDates })
}
