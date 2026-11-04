'use client';

import { type ReactNode, useRef, useState } from 'react';

import {
  type MotionValue,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';

import { cn } from '@repo/ui/lib/utils';

import { CornerOrnaments } from './ornaments';

export interface Chapter {
  title: string;
  text: string;
}

export const DEFAULT_CHAPTERS: Chapter[] = [
  {
    title: 'Gặp gỡ',
    text: 'Ngày ấy, giữa bao nhiêu người qua lại, anh lại nhìn thấy em. Một nụ cười rất khẽ — và mọi thứ bắt đầu từ đó.',
  },
  {
    title: 'Thương nhau',
    text: 'Những buổi chiều đi dạo chẳng cần lý do, những tin nhắn chúc ngủ ngon, những lần nắm tay còn vụng về. Tình yêu đến nhẹ nhàng như thế.',
  },
  {
    title: 'Giận hờn',
    text: 'Rồi cũng có những ngày em giận, quay lưng chẳng nói một lời. Anh vụng về, chỉ biết đứng đó với một bông hoa, chờ em quay lại.',
  },
  {
    title: 'Muốn dừng lại',
    text: 'Có lúc em mệt, em muốn buông tay. Khoảng cách giữa hai đứa dài thêm từng chút, như con đường chẳng còn ai bước cùng.',
  },
  {
    title: 'Nước mắt',
    text: 'Em đã khóc trong một chiều mưa. Và anh quay lại — che cho em một chiếc ô, đứng bên em cho đến khi trời tạnh.',
  },
  {
    title: 'Về chung một nhà',
    text: 'Đi qua giận hờn, qua nước mắt, cuối cùng chúng mình vẫn chọn nhau. Và hôm nay, chúng mình về chung một nhà.',
  },
];

type Mood = 'smile' | 'worried' | 'sad' | 'cry';
type Arm = 'down' | 'hold' | 'offer' | 'up';

interface Pose {
  /** Centre of the figure in scene units (scene is 400 wide). */
  x: number;
  mood: Mood;
  arm: Arm;
  /** Turned away from the viewer (back of the head shows). */
  back?: boolean;
}

interface Scene {
  /** Sky gradient, top and horizon. */
  sky: [string, string];
  groom: Pose;
  bride: Pose;
  wedding?: boolean;
}

// One scene per chapter, in DEFAULT_CHAPTERS order
const SCENES: Scene[] = [
  {
    sky: ['#fbe3c0', '#fdf5e8'],
    groom: { x: 120, mood: 'smile', arm: 'down' },
    bride: { x: 280, mood: 'smile', arm: 'down' },
  },
  {
    sky: ['#f7cfc6', '#fdeee8'],
    groom: { x: 178, mood: 'smile', arm: 'hold' },
    bride: { x: 222, mood: 'smile', arm: 'hold' },
  },
  {
    sky: ['#d8d2cc', '#f0ebe5'],
    groom: { x: 160, mood: 'worried', arm: 'offer' },
    bride: { x: 268, mood: 'sad', arm: 'down', back: true },
  },
  {
    sky: ['#c4c2c1', '#e6e2dd'],
    groom: { x: 70, mood: 'sad', arm: 'down' },
    bride: { x: 330, mood: 'sad', arm: 'down', back: true },
  },
  {
    sky: ['#97a9b8', '#d3dbe1'],
    groom: { x: 176, mood: 'sad', arm: 'up' },
    bride: { x: 222, mood: 'cry', arm: 'down' },
  },
  {
    sky: ['#f4cd82', '#fdf2dc'],
    groom: { x: 178, mood: 'smile', arm: 'hold' },
    bride: { x: 222, mood: 'smile', arm: 'hold' },
    wedding: true,
  },
];

const SKIN = '#f3d4bf';
const INK = '#3b2a24';
const HAIR = '#2b211d';
const BRIDE_HAIR = '#4a2f25';
const RED = '#9b1c1f';
const GOLD = '#c99a3b';

const ARM_ANGLE: Record<Arm, number> = {
  down: 0,
  hold: 42,
  offer: 78,
  up: 160,
};

/** Figure height in scene units; figures are drawn on a 48×96 grid. */
const SCALE = 1.55;
const GROUND = 218;

function Face({ mood, reduce }: { mood: Mood; reduce: boolean }) {
  const closed = mood === 'cry';
  return (
    <g>
      {closed ? (
        <>
          <path
            d="M19.5 23.5q1.5-1.4 3 0"
            stroke={INK}
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M25.5 23.5q1.5-1.4 3 0"
            stroke={INK}
            strokeWidth="1"
            fill="none"
          />
        </>
      ) : (
        <>
          <circle cx="21" cy="23" r="1.2" fill={INK} />
          <circle cx="27" cy="23" r="1.2" fill={INK} />
        </>
      )}
      {mood === 'worried' && (
        <path
          d="M18.5 19.5l3.5 1M29.5 19.5l-3.5 1"
          stroke={INK}
          strokeWidth="1"
          strokeLinecap="round"
        />
      )}
      <path
        d={
          mood === 'smile'
            ? 'M21 27.5q3 2.4 6 0'
            : mood === 'worried'
              ? 'M21.5 28.5h5'
              : 'M21 29q3-2.2 6 0'
        }
        stroke="#7a1518"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      {closed &&
        [20.5, 27.5].map((cx, i) => (
          <motion.ellipse
            key={cx}
            cx={cx}
            cy="26"
            rx="0.9"
            ry="1.4"
            fill="#7fb2dd"
            animate={reduce ? { opacity: 1 } : { y: [0, 7], opacity: [1, 0] }}
            transition={
              reduce
                ? undefined
                : { duration: 1.1, repeat: Infinity, delay: i * 0.5 }
            }
          />
        ))}
    </g>
  );
}

const spring = { type: 'spring', stiffness: 90, damping: 18 } as const;

function Arm({
  side,
  angle,
  fill,
  children,
}: {
  side: 'left' | 'right';
  angle: number;
  fill: string;
  children?: ReactNode;
}) {
  // left arm swings out with +deg, right arm with -deg
  const x = side === 'left' ? 7.5 : 35.5;
  return (
    <motion.g
      style={{ transformBox: 'fill-box', originX: 0.5, originY: 0 }}
      animate={{ rotate: side === 'left' ? angle : -angle }}
      transition={spring}
    >
      <rect x={x} y="41" width="5.5" height="22" rx="2.75" fill={fill} />
      <circle cx={x + 2.75} cy="64" r="2.6" fill={SKIN} />
      {children}
    </motion.g>
  );
}

function Groom({
  pose,
  wedding,
  reduce,
}: {
  pose: Pose;
  wedding: boolean;
  reduce: boolean;
}) {
  const sleeve = wedding ? '#8e1b1e' : '#efe7da';
  return (
    <svg viewBox="0 0 48 96" width={48} height={96} overflow="visible">
      {/* trousers + shoes */}
      <rect
        x="17"
        y="64"
        width="6.5"
        height="28"
        rx="2"
        fill={wedding ? '#f7f1e6' : '#2f2a35'}
      />
      <rect
        x="24.5"
        y="64"
        width="6.5"
        height="28"
        rx="2"
        fill={wedding ? '#f7f1e6' : '#2f2a35'}
      />
      <ellipse cx="20" cy="92.5" rx="4.5" ry="2" fill="#1f1816" />
      <ellipse cx="28" cy="92.5" rx="4.5" ry="2" fill="#1f1816" />
      {/* casual shirt */}
      <motion.g animate={{ opacity: wedding ? 0 : 1 }}>
        <path
          d="M12 40q12-7 24 0l1 27H11z"
          fill="#efe7da"
          stroke="#d6c8b3"
          strokeWidth="0.6"
        />
        <path
          d="M21 37l3 5 3-5"
          stroke="#d6c8b3"
          strokeWidth="0.8"
          fill="none"
        />
        <path d="M27 38.5q6 .5 9 1.5l1 27H28z" fill="#000" opacity="0.06" />
      </motion.g>
      {/* áo dài + gold collar for the wedding */}
      <motion.g initial={false} animate={{ opacity: wedding ? 1 : 0 }}>
        <path d="M12.5 40q11.5-7 23 0l3 44H9.5z" fill="#8e1b1e" />
        <path d="M24 37v47" stroke={GOLD} strokeWidth="0.8" opacity="0.7" />
        <path
          d="M20 38q4 2.5 8 0"
          stroke={GOLD}
          strokeWidth="1.4"
          fill="none"
        />
        {[50, 60, 70].map((y) => (
          <circle
            key={y}
            cx="24"
            cy={y}
            r="1.6"
            fill="none"
            stroke={GOLD}
            strokeWidth="0.6"
          />
        ))}
      </motion.g>
      <Arm side="left" angle={0} fill={sleeve} />
      <Arm side="right" angle={ARM_ANGLE[pose.arm]} fill={sleeve}>
        {/* a flower offered to her */}
        <motion.g animate={{ opacity: pose.arm === 'offer' ? 1 : 0 }}>
          <path d="M38.2 66v8" stroke="#3f6b55" strokeWidth="1" />
          <circle cx="38.2" cy="76.5" r="3" fill={RED} />
          <circle cx="38.2" cy="76.5" r="1.1" fill={GOLD} />
        </motion.g>
      </Arm>
      {/* head */}
      <rect x="21" y="31" width="6" height="7" rx="2" fill={SKIN} />
      <circle cx="24" cy="22" r="11" fill={SKIN} />
      <path d="M13 21q1-12 12-12 10 0 11 11-4-5-11-5-7 0-12 6z" fill={HAIR} />
      <Face mood={pose.mood} reduce={reduce} />
      {/* khăn đóng */}
      <motion.path
        initial={false}
        animate={{ opacity: wedding ? 1 : 0 }}
        d="M12.5 17q11.5-9 23 0v4q-11.5-7-23 0z"
        fill={GOLD}
      />
    </svg>
  );
}

function Bride({
  pose,
  wedding,
  reduce,
}: {
  pose: Pose;
  wedding: boolean;
  reduce: boolean;
}) {
  const sleeve = wedding ? '#b3282d' : SKIN;
  return (
    <svg viewBox="0 0 48 96" width={48} height={96} overflow="visible">
      {/* long hair behind */}
      <path d="M12 22q0-14 12-14t12 14v22q-12 5-24 0z" fill={BRIDE_HAIR} />
      <ellipse cx="20" cy="92.5" rx="4" ry="1.8" fill={RED} />
      <ellipse cx="28" cy="92.5" rx="4" ry="1.8" fill={RED} />
      {/* everyday dress */}
      <motion.g initial={false} animate={{ opacity: wedding ? 0 : 1 }}>
        <rect x="18.5" y="70" width="4.5" height="21" rx="2" fill={SKIN} />
        <rect x="25" y="70" width="4.5" height="21" rx="2" fill={SKIN} />
        <path d="M16 40q8-6 16 0l7 34H9z" fill="#c9776b" />
        <path
          d="M17 52q7 3 14 0"
          stroke="#b5655a"
          strokeWidth="0.8"
          fill="none"
        />
        <path d="M27 38q3 .8 5 2l7 34h-11z" fill="#000" opacity="0.08" />
      </motion.g>
      {/* áo dài đỏ over silk trousers */}
      <motion.g initial={false} animate={{ opacity: wedding ? 1 : 0 }}>
        <path d="M14 76h20l1 15H13z" fill="#f7efe2" />
        <path d="M16 40q8-6 16 0l4 46H12z" fill="#b3282d" />
        <path d="M24 46v40" stroke={GOLD} strokeWidth="0.7" opacity="0.6" />
        {[
          [20, 56],
          [28, 62],
          [21, 70],
          [27, 78],
        ].map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="1.3"
            fill={GOLD}
            opacity="0.85"
          />
        ))}
        <path
          d="M20.5 38q3.5 2.5 7 0"
          stroke={GOLD}
          strokeWidth="1.3"
          fill="none"
        />
      </motion.g>
      <Arm side="left" angle={ARM_ANGLE[pose.arm]} fill={sleeve} />
      <Arm side="right" angle={0} fill={sleeve} />
      {/* head: face, or the back of her head when she turns away */}
      <rect x="21" y="31" width="6" height="7" rx="2" fill={SKIN} />
      <circle cx="24" cy="22" r="11" fill={SKIN} />
      <motion.g initial={false} animate={{ opacity: pose.back ? 0 : 1 }}>
        <path d="M13 21q0-12 11-12t11 12q-3-6-11-6t-11 6z" fill={BRIDE_HAIR} />
        <Face mood={pose.mood} reduce={reduce} />
        <circle cx="18.5" cy="26.5" r="1.6" fill="#f4a7b9" opacity="0.6" />
        <circle cx="29.5" cy="26.5" r="1.6" fill="#f4a7b9" opacity="0.6" />
      </motion.g>
      <motion.circle
        initial={false}
        animate={{ opacity: pose.back ? 1 : 0 }}
        cx="24"
        cy="21.5"
        r="11.6"
        fill={BRIDE_HAIR}
      />
      {/* khăn vấn */}
      <motion.path
        initial={false}
        animate={{ opacity: wedding ? 1 : 0 }}
        d="M12.5 17.5q11.5-10 23 0v3.5q-11.5-8-23 0z"
        fill={GOLD}
      />
    </svg>
  );
}
const LAST = SCENES.length - 1;
/** Scroll progress (0..1) at which each chapter's scene is fully shown. */
const STOPS = SCENES.map((_, i) => i / LAST);

function Figure({
  x,
  label,
  side,
  children,
}: {
  /** Which way the name tag leans, so close-standing tags don't overlap. */
  side: 'left' | 'right';
  /** Centre of the figure in scene units, driven by scroll. */
  x: MotionValue<number>;
  /** Name tag under the figure. */
  label: string;
  children: ReactNode;
}) {
  const w = 48 * SCALE;
  const h = 96 * SCALE;
  const left = useTransform(x, (v) => v - w / 2);
  return (
    <motion.g style={{ x: left, y: GROUND - h }}>
      <ellipse
        cx={w / 2}
        cy={h}
        rx={w * 0.34}
        ry="4.5"
        fill="rgb(40 20 10 / 0.14)"
      />
      <g transform={`scale(${SCALE})`}>{children}</g>
      <text
        x={side === 'left' ? w / 2 + 10 : w / 2 - 10}
        y={h + 16}
        textAnchor={side === 'left' ? 'end' : 'start'}
        fontSize="9"
        fill="#6b5546"
      >
        {label}
      </text>
    </motion.g>
  );
}

/**
 * A layer that belongs to one chapter: it fades in as that chapter's scene
 * arrives and out as the next one takes over. Its looping animations only
 * mount while the chapter is near, so off-screen weather costs nothing.
 */
function ChapterLayer({
  p,
  index,
  active,
  children,
}: {
  p: MotionValue<number>;
  index: number;
  active: number;
  children: ReactNode;
}) {
  const c = STOPS[index]!;
  const span = 1 / LAST;
  const opacity = useTransform(
    p,
    [c - span * 0.65, c - span * 0.3, c + span * 0.3, c + span * 0.65],
    [0, 1, 1, 0],
  );
  if (Math.abs(active - index) > 1) return null;
  return <motion.g style={{ opacity }}>{children}</motion.g>;
}

const heart = 'M0 3c0-3 4-4 5-1 1-3 5-2 5 1 0 3-5 6-5 6s-5-3-5-6z';

/** Weather and props for each chapter. */
function Atmosphere({
  p,
  active,
  reduce,
}: {
  p: MotionValue<number>;
  active: number;
  reduce: boolean;
}) {
  const loop = (duration: number, delay = 0) =>
    reduce ? { duration: 0 } : { duration, delay, repeat: Infinity };
  const layer = (index: number, children: ReactNode) => (
    <ChapterLayer key={index} p={p} index={index} active={active}>
      {children}
    </ChapterLayer>
  );

  return (
    <>
      {layer(
        0,
        (
          [
            [196, 150],
            [210, 132],
            [186, 128],
          ] as const
        ).map(([x, y], i) => (
          <motion.path
            key={i}
            d={`M${x} ${y - 5}l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4z`}
            fill={GOLD}
            animate={
              reduce
                ? undefined
                : { opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }
            }
            transition={loop(1.8, i * 0.4)}
          />
        )),
      )}
      {layer(
        1,
        [180, 196, 210, 222, 202].map((x, i) => (
          <motion.path
            key={i}
            d={heart}
            transform={`translate(${x} 120)`}
            fill={i % 2 ? '#c0392b' : '#e46a6a'}
            animate={
              reduce ? { opacity: 0.8 } : { y: [0, -70], opacity: [0, 1, 0] }
            }
            transition={loop(3, i * 0.55)}
          />
        )),
      )}
      {layer(
        2,
        <motion.g
          animate={reduce ? undefined : { x: [0, 6, 0] }}
          transition={loop(6)}
        >
          <path
            d="M240 62q0-14 14-14 6-10 18-6 12-4 16 8 12 0 12 12 0 10-12 10h-38q-10 0-10-10z"
            fill="#8f959b"
            opacity="0.85"
          />
          <motion.path
            d="M268 74l-6 12h6l-4 10"
            stroke={GOLD}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            animate={reduce ? undefined : { opacity: [0, 1, 0, 0] }}
            transition={loop(2.4)}
          />
        </motion.g>,
      )}
      {layer(
        3,
        <>
          <path
            d="M150 218l14 6-8 5 16 5-6 6 14 4"
            stroke="#6b5f57"
            strokeWidth="1.6"
            fill="none"
            strokeLinejoin="round"
          />
          <path
            d="M250 218l-12 5 9 6-15 4"
            stroke="#6b5f57"
            strokeWidth="1.2"
            fill="none"
          />
          {[90, 160, 240, 310, 200].map((x, i) => (
            <motion.ellipse
              key={i}
              cx={x}
              cy="20"
              rx="4"
              ry="2"
              fill={i % 2 ? '#b98a4a' : '#a0613a'}
              animate={
                reduce
                  ? { y: 60 + i * 20 }
                  : { y: [0, 190], x: [0, 18, -10, 12], rotate: [0, 200] }
              }
              transition={loop(5, i * 0.9)}
            />
          ))}
        </>,
      )}
      {layer(
        4,
        <>
          {Array.from({ length: 30 }, (_, i) => (
            <motion.line
              key={i}
              x1={((i * 37) % 480) - 40}
              y1="-60"
              x2={((i * 37) % 480) - 46}
              y2="-40"
              stroke="#6f8597"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.55"
              animate={reduce ? { y: 80 + (i % 6) * 30 } : { y: [0, 300] }}
              transition={loop(0.9 + (i % 5) * 0.12, (i % 7) * 0.13)}
            />
          ))}
          {/* the red umbrella he brings back */}
          <path d="M146 80q54-62 108 0z" fill={RED} />
          <path
            d="M200 22q-14 20-12 58M200 22q14 20 12 58"
            stroke="#000"
            strokeOpacity="0.12"
            fill="none"
          />
          <path
            d="M146 80q9-7 18 0 9-7 18 0 9-7 18 0 9-7 18 0 9-7 18 0 9-7 18 0"
            fill="#fbf0d9"
            opacity="0.25"
          />
          <path
            d="M200 80v66q0 5-5 5"
            stroke="#4a3a33"
            strokeWidth="2"
            fill="none"
          />
        </>,
      )}
      {layer(
        5,
        <>
          <text
            x="200"
            y="58"
            textAnchor="middle"
            fontSize="46"
            fill={RED}
            style={{ fontFamily: 'var(--font-han)' }}
          >
            囍
          </text>
          {[
            [56, 46, 1],
            [344, 46, 1],
            [118, 30, 0.75],
            [282, 30, 0.75],
          ].map(([x, len, s], i) => (
            <motion.g
              key={i}
              style={{ originX: 0.5, originY: 0 }}
              animate={reduce ? undefined : { rotate: [-3, 3, -3] }}
              transition={loop(3.2, i * 0.4)}
            >
              <line
                x1={x}
                y1="-300"
                x2={x}
                y2={len}
                stroke={GOLD}
                strokeWidth="1"
              />
              <g transform={`translate(${x} ${len}) scale(${s})`}>
                <rect x="-7" y="0" width="14" height="4" rx="1" fill={GOLD} />
                <ellipse cx="0" cy="16" rx="15" ry="13" fill="#c0392b" />
                <ellipse
                  cx="-4"
                  cy="12"
                  rx="5"
                  ry="6"
                  fill="#fff"
                  opacity="0.15"
                />
                <path
                  d="M-8 16h16M0 4v24"
                  stroke={GOLD}
                  strokeWidth="0.8"
                  opacity="0.6"
                />
                <rect x="-7" y="27" width="14" height="4" rx="1" fill={GOLD} />
                <path
                  d="M0 31v9M-2 31v7M2 31v7"
                  stroke={GOLD}
                  strokeWidth="0.9"
                />
              </g>
            </motion.g>
          ))}
          <rect
            x="-400"
            y={GROUND}
            width="1200"
            height="60"
            fill={RED}
            opacity="0.12"
          />
        </>,
      )}
    </>
  );
}

/** Distant hills and a đình roof: the slowest parallax layer. */
function FarLayer({ x }: { x: MotionValue<number> }) {
  return (
    <motion.g style={{ x }}>
      <path
        d="M-120 182Q-20 128 80 170T280 160T480 150T700 172V260H-120Z"
        fill="#b9a383"
        opacity="0.28"
      />
      {/* đình roof with upturned eaves */}
      <g transform="translate(316 142)" fill="#8a6f55" opacity="0.32">
        <path d="M-34 10q4-2 6-7 14-9 28-9t28 9q2 5 6 7q-6 1-10-1H-24q-4 2-10 1z" />
        <rect x="-20" y="10" width="40" height="12" />
        <path d="M-26 22h52v4h-52z" />
      </g>
    </motion.g>
  );
}

/** Rolling hills and trees closer to the couple. */
function MidLayer({ x }: { x: MotionValue<number> }) {
  const trees = [-60, 20, 330, 410, 520, 600];
  return (
    <motion.g style={{ x }}>
      <path
        d="M-160 205Q-40 172 80 198T320 194T560 190T760 204V260H-160Z"
        fill="#9fae86"
        opacity="0.35"
      />
      {trees.map((tx, i) => (
        <g key={tx} transform={`translate(${tx} ${192 - (i % 2) * 6})`}>
          <rect
            x="-2"
            y="0"
            width="4"
            height="22"
            rx="1"
            fill="#6e5a48"
            opacity="0.55"
          />
          <circle
            cx="0"
            cy="-6"
            r={14 + (i % 3) * 3}
            fill="#7f9468"
            opacity="0.5"
          />
          <circle
            cx="6"
            cy="-12"
            r={9 + (i % 2) * 2}
            fill="#94a97b"
            opacity="0.5"
          />
        </g>
      ))}
    </motion.g>
  );
}

/** Large out-of-focus petals drifting past the lens: the fastest layer. */
function ForeLayer({ x, reduce }: { x: MotionValue<number>; reduce: boolean }) {
  const petals = [
    [-10, 236, 14, '#c0392b'],
    [260, 244, 16, '#c0392b'],
    [560, 238, 14, '#e9b44c'],
  ] as const;
  return (
    <motion.g style={{ x }} opacity="0.35">
      {petals.map(([px, py, r, fill], i) => (
        <motion.ellipse
          key={i}
          cx={px}
          cy={py}
          rx={r}
          ry={r * 0.55}
          fill={fill}
          animate={reduce ? undefined : { rotate: [0, 20, 0], y: [0, 6, 0] }}
          transition={
            reduce
              ? undefined
              : { duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      ))}
    </motion.g>
  );
}

/**
 * Scrollytelling love story in 2.5D: the chapters scroll normally while a
 * sticky scene follows the scroll continuously — the sky shifts colour,
 * layers drift at different depths, the camera eases in, and the couple meet,
 * sulk, drift apart, cry in the rain and finally marry.
 */
export function LoveStory({
  groomName,
  brideName,
  chapters = DEFAULT_CHAPTERS,
}: {
  groomName: string;
  brideName: string;
  chapters?: Chapter[];
}) {
  const reduce = !!useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);

  // Progress across the chapter list as it passes a reading line 62% down
  // the screen; remapped so chapter i's centre on that line = scene i
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ['start 62%', 'end 62%'],
  });
  const n = chapters.length;
  const story = useTransform(scrollYProgress, (r) =>
    Math.min(1, Math.max(0, (r * n - 0.5) / Math.max(1, n - 1))),
  );
  const p = useSpring(story, {
    stiffness: 110,
    damping: 28,
    mass: 0.5,
  });

  const [active, setActive] = useState(0);
  useMotionValueEvent(p, 'change', (v) => {
    const next = Math.min(LAST, Math.max(0, Math.round(v * LAST)));
    setActive((a) => (a === next ? a : next));
  });

  const skyTop = useTransform(
    p,
    STOPS,
    SCENES.map((s) => s.sky[0]),
  );
  const skyBottom = useTransform(
    p,
    STOPS,
    SCENES.map((s) => s.sky[1]),
  );
  const groomX = useTransform(
    p,
    STOPS,
    SCENES.map((s) => s.groom.x),
  );
  const brideX = useTransform(
    p,
    STOPS,
    SCENES.map((s) => s.bride.x),
  );
  // sun: high and warm, sinking behind the clouds, back as golden light
  const sunY = useTransform(p, STOPS, [0, 8, 46, 90, 150, 10]);
  const sunOpacity = useTransform(p, STOPS, [1, 0.9, 0.45, 0.25, 0, 1]);
  // parallax: far drifts least, foreground most
  const farX = useTransform(p, [0, 1], [0, -50]);
  const midX = useTransform(p, [0, 1], [0, -120]);
  const foreX = useTransform(p, [0, 1], [0, -260]);
  // camera: eases in on the couple, pulls back when they drift apart
  const zoom = useTransform(p, STOPS, [1, 1.06, 1.1, 1, 1.12, 1.16]);

  const scene = SCENES[active]!;
  const wedding = !!scene.wedding;

  return (
    <div className="relative mt-4 lg:grid lg:grid-cols-[1fr_1.15fr] lg:gap-14">
      {/* the scene */}
      <div
        aria-hidden
        className={`sticky top-0 z-10 -mx-4 bg-background/90 px-4 pt-3 pb-4
          backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-[12vh] lg:order-2 lg:mx-0
          lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none`}
      >
        <div
          className={`relative h-[42svh] overflow-hidden rounded-3xl shadow-lift
            ring-1 ring-gold/40 lg:aspect-[5/4] lg:h-auto lg:max-h-[78vh]`}
        >
          <motion.div
            className="absolute inset-0"
            style={{ scale: zoom, originX: 0.5, originY: 0.88 }}
          >
            <svg
              viewBox="0 0 400 250"
              preserveAspectRatio="xMidYMax meet"
              className="absolute inset-0 size-full"
            >
              <defs>
                <linearGradient id="love-sky" x1="0" y1="0" x2="0" y2="1">
                  <motion.stop offset="0" style={{ stopColor: skyTop }} />
                  <motion.stop offset="1" style={{ stopColor: skyBottom }} />
                </linearGradient>
                <linearGradient id="love-ground" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#e6d6bb" />
                  <stop offset="1" stopColor="#d4bf9c" />
                </linearGradient>
                <radialGradient id="love-sun">
                  <stop offset="0" stopColor="#ffe3a3" />
                  <stop offset="0.45" stopColor="#f6c76b" stopOpacity="0.6" />
                  <stop offset="1" stopColor="#f6c76b" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect
                x="-400"
                y="-500"
                width="1200"
                height="800"
                fill="url(#love-sky)"
              />
              <motion.circle
                cx="300"
                cy="64"
                r="60"
                fill="url(#love-sun)"
                style={{ y: sunY, opacity: sunOpacity }}
              />
              <FarLayer x={farX} />
              <MidLayer x={midX} />
              <rect
                x="-400"
                y={GROUND}
                width="1200"
                height="300"
                fill="url(#love-ground)"
              />
              <Atmosphere p={p} active={active} reduce={reduce} />
              <Figure x={groomX} label={groomName} side="left">
                <Groom pose={scene.groom} wedding={wedding} reduce={reduce} />
              </Figure>
              <Figure x={brideX} label={brideName} side="right">
                <Bride pose={scene.bride} wedding={wedding} reduce={reduce} />
              </Figure>
              <ForeLayer x={foreX} reduce={reduce} />
            </svg>
          </motion.div>

          {/* soft vignette + gold frame */}
          <div
            className={`pointer-events-none absolute inset-0
              bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(60_30_20/0.18)_100%)]`}
          />
          <div
            className={`pointer-events-none absolute inset-2.5 rounded-[1.25rem]
              border border-gold/40`}
          />
          <CornerOrnaments inset={14} className="opacity-70" />
          {/* progress */}
          <div className="absolute inset-x-0 top-4 flex justify-center gap-1.5">
            {chapters.map((c, i) => (
              <span
                key={c.title}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  i === active ? 'w-6 bg-primary' : 'w-1.5 bg-primary/25',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* the chapters */}
      <ol ref={listRef} className="relative lg:order-1">
        {chapters.map((c, i) => (
          <li
            key={c.title}
            className="flex min-h-[70svh] items-center py-8 lg:min-h-[85vh]"
          >
            <article
              className={cn(
                `rounded-3xl bg-card/95 p-6 shadow-soft ring-1 ring-gold/25
                transition-[opacity,scale] duration-500 sm:p-8`,
                i === active ? 'opacity-100' : 'opacity-50 lg:scale-[0.97]',
              )}
            >
              <span
                className={`text-xs font-semibold tracking-[0.3em] text-primary
                uppercase`}
              >
                Chương {i + 1}
              </span>
              <h3
                className={`mt-2 font-serif text-2xl font-medium tracking-tight
                text-rose-deep sm:text-3xl`}
              >
                {c.title}
              </h3>
              <p
                className={`mt-3 text-[15px] leading-relaxed text-foreground/85
                sm:text-base`}
              >
                {c.text}
              </p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
