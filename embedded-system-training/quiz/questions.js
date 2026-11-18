/*
 * Expert question bank for the Embedded System Training quiz
 * (target audience: embedded software engineers with 3+ years of experience).
 *
 * Each question:
 *   id          unique string (prefix per module: c, m, p, r, d, v)
 *   module      "c" | "mcu" | "comm" | "rtos" | "do178c" | "mcdc"
 *   level       "expert"
 *   q           question text (`backticks` render as inline code)
 *   code        optional code snippet (shown in a <pre> block)
 *   options     exactly 4 distinct answer strings
 *   answer      index (0-3) of the correct option in `options` (options are shuffled at run time)
 *   explanation shown on the results screen
 *
 * Bank layout: this file holds the module list, the QUIZ_ADD helper and the first 12 questions per module
 * (16 for mcdc). The extra questions live in q-c.js, q-mcu.js, q-comm.js, q-rtos.js and q-do178c.js and are added with
 * QUIZ_ADD(module, rows), where each row is [question, code-or-null, [4 options, CORRECT FIRST], explanation].
 * Ids are assigned in order (c13, c14, ...). APPEND ONLY: inserting or deleting a row renumbers every later id.
 * Each attempt draws QUIZ_PER_MODULE questions per module at random (see quiz.js).
 *
 * Run `npm run validate` after editing. Verify every MC/DC test set with tools/mcdc.js.
 */
window.QUIZ_MODULES = {
  c:      "Embedded C",
  mcu:    "MCU & Peripherals",
  comm:   "Communication Protocols",
  rtos:   "RTOS",
  do178c: "DO-178C",
  mcdc:   "Coverage & MC/DC"
};

window.QUIZ_PER_MODULE = 25; // questions drawn per module in each attempt

var QUIZ_PREFIX = { c: "c", mcu: "m", comm: "p", rtos: "r", do178c: "d", mcdc: "v" };
window.QUIZ_ADD = function (module, rows) {
  var n = window.QUIZ_QUESTIONS.filter(function (q) { return q.module === module; }).length;
  rows.forEach(function (r) {
    n++;
    var q = { id: QUIZ_PREFIX[module] + (n < 10 ? "0" : "") + n, module: module, level: "expert", q: r[0] };
    if (r[1]) q.code = r[1];
    q.options = r[2]; q.answer = 0; q.explanation = r[3];
    window.QUIZ_QUESTIONS.push(q);
  });
};

window.QUIZ_QUESTIONS = [
  /* ---------------- Module 1: Embedded C ---------------- */
  {
    id: "c01", module: "c", level: "expert",
    q: "On a target with 32-bit `int`, what does this condition evaluate to?",
    code: "uint16_t a = 0xFFFFU, b = 1U;\nif ((a + b) == 0U) { /* ... */ }",
    options: [
      "False: both operands are promoted to int, so the sum is 65536 and not 0",
      "True: uint16_t arithmetic wraps around to 0 at the 16-bit limit",
      "Undefined behaviour, because the unsigned addition overflows the type",
      "Implementation-defined, and most compilers evaluate it as true"
    ],
    answer: 0,
    explanation: "Both operands are promoted to (signed) int before the addition, so the result is int 65536, not 0. On a 16-bit-int target, the same code would wrap to 0 and the condition would be true, which is why MISRA's essential type rules flag it."
  },
  {
    id: "c02", module: "c", level: "expert",
    q: "Why is this comparison false on a 32-bit-int target?",
    code: "uint8_t x = 0x0FU;\nif (~x == 0xF0U) { /* never taken */ }",
    options: [
      "`~x` is evaluated after promotion to int, giving 0xFFFFFFF0 and not 0xF0",
      "`~` is not permitted on unsigned operands, so the result is undefined",
      "The constant 0xF0U is only a 16-bit value and cannot match 32 bits",
      "The comparison is undefined behaviour because of the signed promotion"
    ],
    answer: 0,
    explanation: "Integer promotion happens before the bitwise complement. Casting the result back, as in `(uint8_t)~x`, gives 0xF0. MISRA C requires such results to be cast to the essential type that was intended."
  },
  {
    id: "c03", module: "c", level: "expert",
    q: "A developer writes an overflow guard for a signed addition. What can an optimising compiler legally do with it?",
    code: "int32_t add100(int32_t a) {\n    if (a + 100 < a) { return INT32_MAX; }\n    return a + 100;\n}",
    options: [
      "Remove the check, since signed overflow is undefined behaviour",
      "Keep the check, because the compiler must preserve every comparison it sees",
      "Convert the check into an unsigned comparison so it still detects overflow",
      "Insert a run-time trap automatically whenever the addition overflows"
    ],
    answer: 0,
    explanation: "Because signed overflow is undefined, the compiler may assume `a + 100 < a` is always false and delete the branch. Check before the operation instead: `if (a > INT32_MAX - 100)`."
  },
  {
    id: "c04", module: "c", level: "expert",
    q: "What is the well-defined way to obtain the bit pattern of a `float` as a `uint32_t`?",
    options: [
      "memcpy(&u, &f, sizeof u);",
      "u = *(uint32_t *)&f;",
      "u = (uint32_t)f;",
      "u = *(volatile uint32_t *)&f;"
    ],
    answer: 0,
    explanation: "Accessing a float through a uint32_t pointer violates the strict aliasing (effective type) rules, which is undefined behaviour, and `volatile` doesn't change that. A cast converts the value, not the bits. memcpy is well defined, and compilers optimise it into a register move."
  },
  {
    id: "c05", module: "c", level: "expert",
    q: "Two cores share `data` and a `volatile` flag `ready`. Core 0 writes `data`, then sets `ready = 1`. What is the problem?",
    options: [
      "`volatile` does not order the write to `data`; use atomics or barriers",
      "There is no problem, because volatile guarantees ordering between cores",
      "volatile variables cannot be shared between cores",
      "The only risk is that the compiler deletes the write to `ready`"
    ],
    answer: 0,
    explanation: "volatile only constrains how the compiler treats volatile accesses. Neither the compiler nor the hardware is required to complete the write to `data` before the flag becomes visible. C11 atomics with memory_order_release/acquire, or platform barriers such as Arm DMB, provide the ordering."
  },
  {
    id: "c06", module: "c", level: "expert",
    q: "In MISRA C:2012, which statement about rule categories is correct?",
    options: [
      "Mandatory cannot be deviated; Required needs a formal deviation",
      "All rules can be deviated if a tool reports them as false positives",
      "Advisory rules need a formal deviation; Required rules don't",
      "Only Mandatory rules need to be checked by static analysis"
    ],
    answer: 0,
    explanation: "MISRA C:2012 defines Mandatory, Required and Advisory guidelines. Mandatory guidelines allow no deviation. Required ones may be deviated only with a documented, approved deviation record."
  },
  {
    id: "c07", module: "c", level: "expert",
    q: "Why do safety-critical coding standards usually forbid recursion?",
    options: [
      "Worst-case stack use cannot be bounded statically in general",
      "Recursion is undefined behaviour in C",
      "Recursive functions can't be unit tested",
      "Compilers can't generate code for recursion on microcontrollers"
    ],
    answer: 0,
    explanation: "Without a statically known maximum depth, a call-graph analysis can't produce a worst-case stack figure, and stack overflow can't be ruled out."
  },
  {
    id: "c08", module: "c", level: "expert",
    q: "What is the most likely `sizeof` for this struct on a typical 32-bit Arm ABI, and what follows from it?",
    code: "struct msg { uint8_t a; uint32_t b; uint8_t c; };",
    options: [
      "12 bytes, because of padding, so do not overlay it on wire data",
      "6 bytes, because members are packed together unless told otherwise",
      "8 bytes, because the compiler reorders members to minimise padding",
      "Exactly 6 bytes on every platform, as the C standard defines the layout"
    ],
    answer: 0,
    explanation: "With 4-byte alignment for uint32_t, a sits at offset 0, b at 4 and c at 8, and the size is rounded up to 12. C doesn't allow member reordering, and padding is implementation-defined. Parse messages field by field."
  },
  {
    id: "c09", module: "c", level: "expert",
    q: "What is wrong with this code?",
    code: "#define MAX(a, b) ((a) > (b) ? (a) : (b))\nm = MAX(i++, j);",
    options: [
      "`i++` is evaluated twice; use a `static inline` function",
      "Nothing is wrong, because the parentheses make the macro safe for any argument",
      "It is a syntax error, because a macro cannot contain a conditional operator",
      "The result is always `j`, because the comparison is evaluated only once"
    ],
    answer: 0,
    explanation: "The macro argument is expanded twice, so the side effect runs twice when i++ is the larger value. Function-like macros with side-effecting arguments are restricted by MISRA C."
  },
  {
    id: "c10", module: "c", level: "expert",
    q: "Two Q15 values, both -32768 (= -1.0), are multiplied as `((int32_t)a * b) >> 15`. What must the code handle?",
    options: [
      "The result +32768 does not fit in `int16_t`, so saturate it",
      "Nothing special: Q15 multiplication can never overflow the 16-bit result",
      "The 32-bit intermediate product overflows, so a 64-bit type is needed",
      "The shift should be 16 bits instead of 15 to keep the sign"
    ],
    answer: 0,
    explanation: "-1 × -1 = +1.0, which isn't representable in Q15 (maximum about 0.99997). The 32-bit product (2^30) is fine; the problem is narrowing back to 16 bits, so saturate."
  },
  {
    id: "c11", module: "c", level: "expert",
    q: "A static stack-analysis tool reports an incomplete call graph for a module. What is the most likely cause?",
    options: [
      "Calls through function pointers, which the tool cannot resolve without annotations",
      "The use of `static inline` functions, which hide their callers from the tool",
      "The use of `const` lookup tables, which move data out of the analysed code",
      "Functions with more than four parameters, which exceed the tool's frame model"
    ],
    answer: 0,
    explanation: "Indirect calls hide the call targets. Most analysers need the possible targets annotated (or the design restricted) to compute worst-case stack depth."
  },
  {
    id: "c12", module: "c", level: "expert",
    q: "Which statement is undefined behaviour?",
    options: [
      "`i = i++ + 1;` modifies `i` twice without sequencing",
      "`i = i + 1;` assigns a value computed from the old `i`",
      "`i += 1;` is a compound assignment to a single object",
      "`j = i++ + 1;` modifies `i` once and assigns to a different object"
    ],
    answer: 0,
    explanation: "In `i = i++ + 1;`, i is modified twice without sequencing, which is undefined. The other statements modify i at most once."
  },

  /* ---------------- Module 2: MCU & Peripherals ---------------- */
  {
    id: "m01", module: "mcu", level: "expert",
    q: "On a Cortex-M7 with D-cache enabled, a UART DMA receive buffer sometimes contains old data when the CPU reads it after the transfer completes. What is the correct fix?",
    options: [
      "Invalidate the buffer's cache lines after DMA, with line-aligned buffers",
      "Clean the cache lines before reading, so DMA data reaches the CPU",
      "Disable the DMA interrupt and read the buffer in a polling loop",
      "Declare the buffer `volatile` so the cache is bypassed on every read"
    ],
    answer: 0,
    explanation: "The CPU is reading stale cached copies. Invalidation discards them so that the next read comes from RAM. Alignment prevents invalidating unrelated variables that share a cache line. volatile doesn't affect the cache."
  },
  {
    id: "m02", module: "mcu", level: "expert",
    q: "Same Cortex-M7 system: a DMA transmit sends stale bytes even though the CPU just filled the buffer. What is missing?",
    options: [
      "A cache clean of the buffer before starting the DMA",
      "A cache invalidate of the buffer before starting the DMA",
      "An ISB instruction after the DMA starts",
      "Disabling the instruction cache"
    ],
    answer: 0,
    explanation: "The new data is still only in the write-back D-cache. Cleaning writes it to RAM, where the DMA reads from."
  },
  {
    id: "m03", module: "mcu", level: "expert",
    q: "An ISR clears the peripheral interrupt flag as its last instruction, and occasionally runs a second time for one event. What is the likely cause and fix?",
    options: [
      "The flag write had not completed at return; read it back or execute `DSB`",
      "The NVIC pending bit must be cleared before the flag, in every case",
      "The interrupt priority is too high and must be lowered by one level",
      "The handler is too long and the flag must be cleared first thing"
    ],
    answer: 0,
    explanation: "Writes can sit in a write buffer or bus bridge. If the interrupt is still asserted when the exception returns, it is taken again. Arm and MCU vendors recommend a DSB or a read-back."
  },
  {
    id: "m04", module: "mcu", level: "expert",
    q: "Main code does `GPIOA->ODR |= LED1;` and an ISR does `GPIOA->ODR ^= LED2;`. LED2 occasionally fails to toggle. Best fix?",
    options: [
      "Use the atomic set/reset register, or protect the read-modify-write",
      "Declare `GPIOA` `const` so the compiler cannot reorder the write",
      "Move the ISR to a lower priority than the main code",
      "Replace `^=` with `|=` in the interrupt handler"
    ],
    answer: 0,
    explanation: "`|=` is read, modify, write. If the ISR runs between the read and the write, its update is overwritten. Atomic set/reset registers avoid the read entirely."
  },
  {
    id: "m05", module: "mcu", level: "expert",
    q: "What extra failure does a windowed watchdog detect compared with a simple watchdog?",
    options: [
      "Refreshes that come too early, such as from a runaway loop",
      "Refreshes that come too late, which any watchdog already detects",
      "A failure of the oscillator that clocks the watchdog",
      "A loss of power on the watchdog's own supply"
    ],
    answer: 0,
    explanation: "A windowed watchdog resets the MCU if it is refreshed before the window opens, as well as when the refresh comes too late."
  },
  {
    id: "m06", module: "mcu", level: "expert",
    q: "How can an MPU turn a silent stack overflow into an immediately detectable fault?",
    options: [
      "Place a small no-access guard region just past the end of each stack",
      "Mark the whole stack region read-only after it is initialised",
      "Make the stack region execute-never so it cannot hold code",
      "Map the stack into the same region as the heap"
    ],
    answer: 0,
    explanation: "Any access into the guard region raises a MemManage fault at the moment of overflow, instead of corrupting adjacent data."
  },
  {
    id: "m07", module: "mcu", level: "expert",
    q: "After writing `MPU->CTRL` to enable the MPU, Arm recommends `__DSB(); __ISB();`. Why?",
    options: [
      "To make sure the write completed and later code uses the new settings",
      "To flush the data cache before the MPU regions take effect",
      "To switch the core into privileged mode for the MPU update",
      "To clear all pending exceptions before the MPU starts checking"
    ],
    answer: 0,
    explanation: "DSB waits for the write to complete. ISB flushes the pipeline so that instructions already fetched under the old configuration are re-fetched."
  },
  {
    id: "m08", module: "mcu", level: "expert",
    q: "Which mechanism provides a lock-free atomic read-modify-write on Armv7-M (for example Cortex-M3/M4) without disabling interrupts?",
    options: [
      "`LDREX`/`STREX` exclusive access, retried if the store fails",
      "A plain `LDR`/`STR` pair, because aligned accesses are atomic",
      "A `DMB` barrier placed between the load and the store",
      "A `WFE` instruction that holds the bus during the update"
    ],
    answer: 0,
    explanation: "Exclusive load/store with the local monitor detects intervening accesses (including exception entry) and lets the code retry. Armv6-M cores (Cortex-M0/M0+) don't have these instructions."
  },
  {
    id: "m09", module: "mcu", level: "expert",
    q: "Why is a March test (for example March C−) preferred over a simple write/read pattern for power-up RAM test?",
    options: [
      "It detects stuck-at, transition and coupling faults in ordered passes",
      "It runs faster than a write/read pattern on the same memory",
      "It detects only faults in the address decoder of the RAM",
      "It repairs faulty cells by remapping them to spare rows"
    ],
    answer: 0,
    explanation: "March algorithms apply ordered sequences in ascending and descending address order, which exposes faults where one cell affects another. A single pattern can miss these."
  },
  {
    id: "m10", module: "mcu", level: "expert",
    q: "What is the purpose of memory scrubbing in an ECC-protected RAM?",
    options: [
      "Periodic read and correct, so single-bit upsets do not build up",
      "Wearing out the RAM cells evenly across the whole array",
      "Erasing sensitive data from RAM after a security event",
      "Copying RAM contents to flash before a power loss"
    ],
    answer: 0,
    explanation: "Single-event upsets (for example from radiation at altitude) are corrected only when a word is read. Scrubbing reads every word regularly, so errors are corrected before a second upset hits the same word."
  },
  {
    id: "m11", module: "mcu", level: "expert",
    q: "Enabling instruction and data caches on a control processor has what effect on certification-relevant timing evidence?",
    options: [
      "Average time improves, but the worst case is harder to bound",
      "Execution time becomes exactly repeatable, which eases evidence",
      "Worst-case timing improves by the same ratio as the average",
      "Nothing changes, because caches are transparent to timing"
    ],
    answer: 0,
    explanation: "Execution time then depends on cache state and history. Worst-case evidence must take this into account, for example through static analysis that models the cache, worst-case measurements or cache locking."
  },
  {
    id: "m12", module: "mcu", level: "expert",
    q: "Your hardware team switches to a new silicon revision of the same MCU late in the program. What should the software team do first?",
    options: [
      "Review the errata and assess the evidence impact",
      "Assume the revision is compatible and keep all existing evidence",
      "Rerun only the tests that failed on the earlier revision",
      "Update the part number in the documents and carry on"
    ],
    answer: 0,
    explanation: "Errata (and fixes) differ between silicon revisions. Workarounds may become unnecessary or new issues may appear. In a certified project, a hardware change also triggers a change impact analysis."
  },

  /* ---------------- Module 3: Communication Protocols ---------------- */
  {
    id: "p01", module: "comm", level: "expert",
    q: "A CAN node's transmit error counter (TEC) reaches 256. What state is it in?",
    options: [
      "Bus-off: it takes no part in bus traffic until it recovers",
      "Error passive: it still sends, but with recessive error flags",
      "Error active: it signals errors with dominant error flags",
      "Sleep mode: it waits for a wake-up pattern on the bus"
    ],
    answer: 0,
    explanation: "A node becomes error passive when TEC or REC exceeds 127, and bus-off when TEC exceeds 255. Recovery from bus-off follows the protocol's recovery sequence and the application's policy."
  },
  {
    id: "p02", module: "comm", level: "expert",
    q: "A faulty CAN node continuously transmits valid, correctly formed frames with ID 0x001. What happens?",
    options: [
      "It starves lower-priority traffic; a bus guardian is needed",
      "Other nodes' error counters push it into bus-off within milliseconds",
      "The controller automatically limits each ID to 10 % bus load",
      "Arbitration rotates priority, so other frames still get through"
    ],
    answer: 0,
    explanation: "This is the 'babbling idiot' failure. The frames are valid, so no errors are detected, and ID 0x001 wins every arbitration."
  },
  {
    id: "p03", module: "comm", level: "expert",
    q: "Bus load on a CAN network rises from 40 % to 80 %. Which messages are most at risk of missing their deadlines?",
    options: [
      "Those with the highest identifiers (lowest priority)",
      "Those with the lowest identifiers, which have the highest priority",
      "All messages equally, because arbitration is fair",
      "Only the extended-ID frames on the bus"
    ],
    answer: 0,
    explanation: "Worst-case response time grows with interference from every higher-priority message, so the lowest-priority frames are affected most. Timing analysis must use worst-case frame lengths, including bit stuffing."
  },
  {
    id: "p04", module: "comm", level: "expert",
    q: "Why must CAN worst-case timing analysis use a stuffed frame length instead of the nominal frame length?",
    options: [
      "Stuffing adds data-dependent bits, so frames can be longer",
      "Stuffing shortens frames, so the nominal length is pessimistic",
      "Stuffing only happens in CAN FD, not in classic CAN",
      "The ACK slot doubles the length of every frame"
    ],
    answer: 0,
    explanation: "After five consecutive equal bits a complementary bit is inserted, so the frame length depends on the content. Analysis uses the worst-case stuffed length."
  },
  {
    id: "p05", module: "comm", level: "expert",
    q: "Which statement about an ARINC 429 word is correct?",
    options: [
      "32 bits: an 8-bit label, data bits and an odd parity bit in bit 32",
      "16 bits, with a CRC-8 appended so single-bit errors can be corrected",
      "32 bits, with even parity and a 4-bit label for up to 16 parameters",
      "A variable length of up to 256 bits, with a length field first"
    ],
    answer: 0,
    explanation: "ARINC 429 uses 32-bit words: label (bits 1–8), SDI, data, SSM and an odd parity bit (bit 32)."
  },
  {
    id: "p06", module: "comm", level: "expert",
    q: "What is the topology of an ARINC 429 bus?",
    options: [
      "One transmitter and several receivers, so two-way exchange needs two buses",
      "Multi-master with bitwise arbitration, so any node may transmit at any time",
      "Command/response, where a bus controller polls every connected terminal",
      "Switched full-duplex Ethernet, with a virtual link for each flow"
    ],
    answer: 0,
    explanation: "Each ARINC 429 bus has exactly one transmitter. Command/response with a bus controller describes MIL-STD-1553B, and switched Ethernet describes AFDX."
  },
  {
    id: "p07", module: "comm", level: "expert",
    q: "Which description matches MIL-STD-1553B?",
    options: [
      "1 Mbit/s command/response from a bus controller, usually on dual-redundant buses",
      "100 kbit/s, one-way, with each word identified by a label",
      "Up to 1 Mbit/s, multi-master, with bitwise arbitration on the identifier",
      "Switched Ethernet with virtual links, bandwidth gaps and two networks"
    ],
    answer: 0,
    explanation: "MIL-STD-1553B is a deterministic command/response bus. The bus controller initiates all transfers, and buses A and B provide redundancy."
  },
  {
    id: "p08", module: "comm", level: "expert",
    q: "How does AFDX (ARINC 664 Part 7) provide deterministic latency over Ethernet?",
    options: [
      "Frames use virtual links whose bandwidth gap is policed by configured switches",
      "CSMA/CD collision detection with a priority-based back-off after each collision",
      "A token passes between the end systems, and only the holder transmits",
      "It does not: AFDX latency stays unbounded, as on any Ethernet"
    ],
    answer: 0,
    explanation: "Each virtual link has a minimum interval between frames (BAG) and a maximum frame size, so worst-case switch queuing and latency can be bounded. Redundant networks A and B add availability."
  },
  {
    id: "p09", module: "comm", level: "expert",
    q: "A sender's software hangs but its communication controller keeps retransmitting the last valid frame. Which receiver-side mechanism detects this?",
    options: [
      "A sequence (alive) counter in the payload that must change with each frame",
      "The CRC of the payload, since it covers every byte of the message",
      "Parity checking on every received byte of the frame",
      "A larger receive buffer on the receiving node, so old frames are dropped"
    ],
    answer: 0,
    explanation: "The repeated frame is valid, so CRC and parity pass. Only a changing counter, or a freshness check on it, reveals stale data."
  },
  {
    id: "p10", module: "comm", level: "expert",
    q: "What is the safest way to decode a received byte buffer into message fields?",
    options: [
      "Check the length, assemble fields with shifts, range-check",
      "Cast the buffer pointer to a packed struct pointer and use it",
      "Copy the buffer into a struct with `memcpy` and use it directly",
      "Overlay the byte array with a struct in a union"
    ],
    answer: 0,
    explanation: "Struct overlays depend on padding, endianness and alignment (unaligned access can fault), and casts break strict aliasing. Explicit decoding is portable and reviewable."
  },
  {
    id: "p11", module: "comm", level: "expert",
    q: "After a processor reset during an I2C read, the bus stays busy because a slave holds SDA low. Standard recovery?",
    options: [
      "Clock SCL up to nine times until the slave releases SDA, then send a STOP",
      "Drive SDA high with a push-pull output to overpower the slave",
      "Increase the value of the pull-up resistors so the slave lets go",
      "Wait for the slave's own watchdog to reset the stuck device"
    ],
    answer: 0,
    explanation: "The slave is in the middle of sending a byte and waits for clocks. Extra SCL pulses let it finish. A STOP then resets the bus state. Never drive an open-drain bus push-pull."
  },
  {
    id: "p12", module: "comm", level: "expert",
    q: "A UART at 921 600 baud with one interrupt per byte loses data under CPU load. Which design is most robust?",
    options: [
      "DMA into a circular buffer, with an idle-line interrupt",
      "Raise the UART interrupt to the highest priority and change nothing else",
      "Poll the UART in the main loop between control tasks",
      "Reduce the stop bits to 0.5 to gain time"
    ],
    answer: 0,
    explanation: "DMA removes the per-byte CPU deadline. The idle-line or timeout interrupt delimits variable-length frames. Size the buffer for the worst-case burst, and monitor overruns."
  },

  /* ---------------- Module 4: RTOS ---------------- */
  {
    id: "r01", module: "rtos", level: "expert",
    q: "Fixed-priority pre-emptive tasks (highest priority first): τ1 C=1 T=4, τ2 C=2 T=6, τ3 C=3 T=12; deadlines equal periods, no blocking. What is τ3's worst-case response time?",
    options: ["10", "6", "9", "12"],
    answer: 0,
    explanation: "R = 3 + ⌈R/4⌉·1 + ⌈R/6⌉·2. Iterating: 6 → 7 → 9 → 10 → 10, so R₃ = 10 ≤ 12 and τ3 is schedulable."
  },
  {
    id: "r02", module: "rtos", level: "expert",
    q: "On a single core, what does the priority ceiling protocol give you that basic priority inheritance doesn't?",
    options: [
      "Freedom from deadlock, and blocking by at most one critical section",
      "No blocking at all, because tasks never wait for lower priorities",
      "A shorter WCET for every task that uses a shared resource",
      "Task priorities that change dynamically to follow the deadlines"
    ],
    answer: 0,
    explanation: "Raising the holder to the resource ceiling prevents a task from being blocked by more than one lower-priority critical section, and rules out circular waits. Priority inheritance allows chained blocking and doesn't prevent deadlock."
  },
  {
    id: "r03", module: "rtos", level: "expert",
    q: "In a FreeRTOS Cortex-M port, an ISR calls `xQueueSendFromISR()` but its NVIC priority is numerically lower (more urgent) than `configMAX_SYSCALL_INTERRUPT_PRIORITY`. What is the risk?",
    options: [
      "The ISR can pre-empt kernel critical sections and corrupt RTOS data",
      "Nothing, because FromISR calls are safe at any interrupt priority",
      "The call is ignored silently and the message is lost",
      "The scheduler is disabled until the next reset"
    ],
    answer: 0,
    explanation: "The kernel masks interrupts only up to configMAX_SYSCALL_INTERRUPT_PRIORITY. Interrupts above it may run during kernel critical sections, so they must not call RTOS APIs. configASSERT can catch this in many ports."
  },
  {
    id: "r04", module: "rtos", level: "expert",
    q: "A binary semaphore protects a shared resource used by high-, medium- and low-priority tasks. The high-priority task sometimes misses deadlines. What is the most likely fix?",
    options: [
      "Replace it with a mutex, which provides priority inheritance",
      "Increase the tick rate so the low-priority task finishes sooner",
      "Give all three tasks the same priority so none can pre-empt",
      "Use a larger queue to carry the data instead"
    ],
    answer: 0,
    explanation: "Binary semaphores have no owner and no priority inheritance, so the medium task can pre-empt the low-priority holder indefinitely (unbounded priority inversion)."
  },
  {
    id: "r05", module: "rtos", level: "expert",
    q: "In ARINC 653, what does time partitioning guarantee?",
    options: [
      "Each partition runs only in its own windows, so an overrun cannot steal time",
      "Partitions share the CPU by priority, so critical ones always win",
      "The health monitor hands out the CPU to partitions on demand",
      "Every partition is bound to its own dedicated core"
    ],
    answer: 0,
    explanation: "A static schedule of partition windows repeats every major frame. Within its window, a partition schedules its own processes."
  },
  {
    id: "r06", module: "rtos", level: "expert",
    q: "What is the role of the ARINC 653 health monitor?",
    options: [
      "It detects errors at several levels and applies a configured recovery",
      "It measures the processor temperature and throttles hot partitions",
      "It schedules the partitions inside each major frame by priority",
      "It allocates extra memory to partitions at run time on request"
    ],
    answer: 0,
    explanation: "The health monitor handles faults such as deadline misses, memory violations and hardware errors, using configured responses such as restarting a process or partition, or stopping the module."
  },
  {
    id: "r07", module: "rtos", level: "expert",
    q: "Why do many high-criticality control systems use a cyclic executive instead of a pre-emptive RTOS?",
    options: [
      "Its fixed, table-driven schedule is deterministic and easier to analyse and verify",
      "It always needs less flash than a pre-emptive RTOS of the same function",
      "It handles sporadic external events better than a priority-based scheduler",
      "It is easier to change late in a project than a pre-emptive design"
    ],
    answer: 0,
    explanation: "A cyclic executive gives a fixed, repeatable timeline. The cost is flexibility: long activities must be split by hand to fit minor frames, and changes can ripple through the table."
  },
  {
    id: "r08", module: "rtos", level: "expert",
    q: "Which FreeRTOS approach guarantees that no task, queue or semaphore is ever allocated from the heap?",
    options: [
      "Use the `...CreateStatic()` APIs with `configSUPPORT_DYNAMIC_ALLOCATION` set to 0",
      "Call `vTaskDelete()` on every task that is no longer needed, to free its heap block",
      "Set `configTOTAL_HEAP_SIZE` large enough that no allocation can ever fail",
      "Use only `vTaskDelayUntil()` for timing, because it avoids heap use"
    ],
    answer: 0,
    explanation: "With dynamic allocation disabled, the dynamic create APIs aren't compiled in, so heap use is impossible by construction."
  },
  {
    id: "r09", module: "rtos", level: "expert",
    q: "WCET for a task was taken as the maximum of 10 000 measured runs. Why might a certification reviewer challenge this?",
    options: [
      "The tests may have missed the worst-case path or cache state",
      "10 000 runs is more than any standard allows for timing tests",
      "A measured maximum is always above the real WCET, so it is too pessimistic",
      "No standard requires WCET evidence for any software level"
    ],
    answer: 0,
    explanation: "A maximum observed time is a lower bound on the true WCET. Reviewers expect an argument that the worst case was actually provoked, or a static analysis."
  },
  {
    id: "r10", module: "rtos", level: "expert",
    q: "On a multicore processor, an application's WCET doubles when the other core runs a memory-intensive task. What is this called, and what guidance addresses it for airborne systems?",
    options: [
      "Interference through shared resources, addressed by CAST-32A and AMC/AC 20-193",
      "Priority inversion between cores, addressed by the ARINC 429 rules",
      "Cache coherency failure, addressed by the MISRA C rules",
      "Clock drift between cores, addressed by DO-254"
    ],
    answer: 0,
    explanation: "Shared caches, interconnects and memory controllers create interference channels between cores. Multicore guidance requires identifying, mitigating and verifying them. Verify which document (CAST-32A, EASA AMC 20-193, FAA AC 20-193) and which revision your authority applies."
  },
  {
    id: "r11", module: "rtos", level: "expert",
    q: "Why must a FreeRTOS mutex not be taken or given from an ISR?",
    options: [
      "Mutexes rely on task ownership and inheritance, which mean nothing in an ISR",
      "Mutexes are slower than semaphores, which an ISR cannot afford",
      "ISRs may not touch any global variable that a lock protects",
      "Mutexes can only be used by the idle task, which an ISR cannot reach"
    ],
    answer: 0,
    explanation: "An ISR is not a task: it can't own a mutex, block, or inherit a priority. Use a binary semaphore, a queue or a task notification from ISRs."
  },
  {
    id: "r12", module: "rtos", level: "expert",
    q: "What is the best watchdog strategy in a multi-task system?",
    options: [
      "A supervisor kicks it only after every critical task checked in on time",
      "The tick interrupt kicks the watchdog, which proves the system is alive",
      "Each task kicks the watchdog whenever it runs, so any live task keeps it fed",
      "The idle task kicks the watchdog, because it runs when nothing else does"
    ],
    answer: 0,
    explanation: "A tick-interrupt kick survives a hung task, and per-task kicks hide a single failed task. Supervised check-ins detect any critical task that stops progressing."
  },

  /* ---------------- Module 5: DO-178C ---------------- */
  {
    id: "d01", module: "do178c", level: "expert",
    q: "Who or what determines the software level (A–E) of an airborne software component?",
    options: [
      "The system safety assessment, from the worst failure condition",
      "The software team, from the complexity of the code",
      "The certification authority, from the size of the aircraft",
      "The programme manager, from the testing budget available"
    ],
    answer: 0,
    explanation: "The level comes from the system process (ARP4754A/B with ARP4761). The failure condition category (catastrophic … no safety effect) maps to Levels A–E."
  },
  {
    id: "d02", module: "do178c", level: "expert",
    q: "What is the purpose of data coupling and control coupling analysis in DO-178C (Levels A–C)?",
    options: [
      "To confirm tests exercised the interfaces between components",
      "To measure design coupling metrics for maintainability reasons",
      "To prove that no global variables are used in the software",
      "To replace integration testing with a paper review"
    ],
    answer: 0,
    explanation: "Structural coverage of each component isn't enough. The analysis confirms that the data and control flows between components were exercised by requirements-based tests."
  },
  {
    id: "d03", module: "do178c", level: "expert",
    q: "A Level B component has 100 % statement and decision coverage from requirements-based tests. Is MC/DC required?",
    options: [
      "No. MC/DC is required only for Level A; Level B requires decision and statement coverage.",
      "Yes, MC/DC is required for Levels A and B",
      "Yes, MC/DC is required for all levels",
      "Only if the authority asks for it in SOI 4"
    ],
    answer: 0,
    explanation: "Level A: MC/DC + decision + statement. Level B: decision + statement. Level C: statement. Level D: no structural coverage objective."
  },
  {
    id: "d04", module: "do178c", level: "expert",
    q: "What is the defining extra requirement of MC/DC over decision coverage?",
    options: [
      "Each condition in a decision must be shown to independently affect the decision's outcome",
      "Every path through the function must be executed",
      "Every condition must be tested with boundary values",
      "Every loop must run zero, one and many times"
    ],
    answer: 0,
    explanation: "MC/DC adds that each condition takes all outcomes and is shown to independently affect the result, with the other conditions held fixed (unique-cause) or masked."
  },
  {
    id: "d05", module: "do178c", level: "expert",
    q: "What is the minimum number of test cases that can achieve MC/DC for `if (A && B && C)`?",
    options: ["4", "3", "6", "8"],
    answer: 0,
    explanation: "N + 1 = 4: TTT (true), then FTT, TFT and TTF, each flipping one condition from the true case to show its independent effect."
  },
  {
    id: "d06", module: "do178c", level: "expert",
    q: "A designer adds a requirement that the sensor filter runs at 100 Hz. It doesn't trace to any system requirement. What must happen?",
    options: [
      "Identify it as a derived requirement and provide it to the system safety assessment process",
      "Delete it, because untraceable requirements aren't allowed",
      "Trace it to the nearest high-level requirement to close the gap",
      "Nothing, as long as it is tested"
    ],
    answer: 0,
    explanation: "Derived requirements are legitimate, but their safety impact must be assessed by the system safety process, because they introduce behaviour not specified at system level."
  },
  {
    id: "d07", module: "do178c", level: "expert",
    q: "Coverage analysis finds an `else` branch that no requirement calls for. It was left over from an earlier design and can't execute. How is it classified, and what is the resolution?",
    options: [
      "Dead code: remove it (and assess the need for re-verification)",
      "Deactivated code: leave it and add a configuration flag",
      "Defensive code: no action needed",
      "Write a test that forces the branch to execute so coverage reaches 100 %"
    ],
    answer: 0,
    explanation: "Code that exists by mistake and doesn't trace to requirements is dead code, which DO-178C says should be removed. Deactivated code is intentional and must be shown unable to activate inadvertently."
  },
  {
    id: "d08", module: "do178c", level: "expert",
    q: "Which is NOT an acceptable way to resolve a structural coverage gap?",
    options: [
      "Adding a test with no requirement behind it, whose only purpose is to execute the uncovered code",
      "Adding a missing requirement and a requirements-based test for it",
      "Improving an inadequate requirements-based test",
      "Removing dead code"
    ],
    answer: 0,
    explanation: "Coverage analysis checks the completeness of requirements-based testing. A structure-only test hides the real cause: a missing requirement, an inadequate test or unwanted code."
  },
  {
    id: "d09", module: "do178c", level: "expert",
    q: "A tool generates C source code from a model, and that code goes into Level A airborne software without the output being independently verified. Which Tool Qualification Level applies under DO-178C/DO-330?",
    options: ["TQL-1", "TQL-4", "TQL-5", "No qualification is needed for code generators"],
    answer: 0,
    explanation: "The tool's output is part of the airborne software and could insert an error (Criterion 1). For Level A that is TQL-1, the most rigorous level."
  },
  {
    id: "d10", module: "do178c", level: "expert",
    q: "A static analysis tool can't insert errors, but its results are used to justify eliminating a manual code-review activity. Which qualification criterion applies?",
    options: [
      "Criterion 2: it automates verification, and its output is used to justify eliminating or reducing other processes",
      "Criterion 1",
      "Criterion 3",
      "None, because verification tools never need qualification"
    ],
    answer: 0,
    explanation: "Criterion 3 covers verification tools that could only fail to detect an error. Once the output is used to eliminate or reduce other processes, Criterion 2 applies. As I recall DO-330 Table 2-1, that gives TQL-4 at Level A and TQL-5 at Levels B to D, but verify the table in the current DO-330 before quoting it."
  },
  {
    id: "d11", module: "do178c", level: "expert",
    q: "At Level A, when is additional verification of the compiler's output required beyond testing the executable object code?",
    options: [
      "When the compiler generates object code that isn't directly traceable to source code",
      "Always, for every line of object code",
      "Only when the compiler is qualified",
      "Never; testing the executable is always sufficient"
    ],
    answer: 0,
    explanation: "Level A requires showing the correctness of object code that isn't directly traceable to the source, for example compiler-inserted checks or library calls. Projects restrict compiler options and constructs, and analyse the rest."
  },
  {
    id: "d12", module: "do178c", level: "expert",
    q: "Which document is the primary means of agreeing the compliance approach with the certification authority at the start of a DO-178C project?",
    options: [
      "The Plan for Software Aspects of Certification (PSAC)",
      "The Software Accomplishment Summary (SAS)",
      "The Software Configuration Index (SCI)",
      "The Software Verification Results (SVR)"
    ],
    answer: 0,
    explanation: "The PSAC describes the software, its level, life cycle, means of compliance, tools and any additional considerations. The SAS at the end reports how compliance with the PSAC was achieved."
  },
  /* ---------------- Coverage & MC/DC (Module 5, sections 3.3-3.5) ----------------
   * Every test set below was checked with: node tools/mcdc.js "<expr>" <tests...>   */
  {
    id: "v01", module: "mcdc", level: "expert",
    q: "What is the minimum number of tests that achieves unique-cause MC/DC for `if (A || B || C)`?",
    options: [
      "4: FFF (F), then TFF, FTF and FFT (T)",
      "3: one test for each condition",
      "6: two tests for each condition",
      "8: every combination of the three conditions"
    ],
    answer: 0,
    explanation: "N + 1 = 4: FFF (F), then TFF, FTF and FFT (all T). For OR, the other conditions are held FALSE so that one TRUE condition decides the outcome."
  },
  {
    id: "v02", module: "mcdc", level: "expert",
    q: "Which test set achieves MC/DC for `if (A || B)`? (Tests are written as values of A, B.)",
    options: ["FF, TF, FT", "TT, FF", "TF, FT", "TT, TF, FT"],
    answer: 0,
    explanation: "FF (F) vs TF (T) shows A; FF vs FT (T) shows B. {TT, FF} gives decision coverage but no independence pair. {TF, FT} and {TT, TF, FT} never make the decision FALSE, so they don't even achieve decision coverage."
  },
  {
    id: "v03", module: "mcdc", level: "expert",
    q: "For `if (A && B)`, which test set achieves 100 % decision coverage but NOT MC/DC?",
    options: ["TT, FF", "TT, FT, TF", "FT, TF", "TT"],
    answer: 0,
    explanation: "TT (T) and FF (F) exercise both outcomes, but both conditions change together, so neither condition's independent effect is shown. A wrong operator (|| instead of &&) would pass these two tests. {TT, FT, TF} achieves MC/DC; {FT, TF} and {TT} miss an outcome."
  },
  {
    id: "v04", module: "mcdc", level: "expert",
    q: "Which 4-test set achieves unique-cause MC/DC for `if ((A && B) || C)`? (Tests are written as A B C.)",
    options: ["TTF, FTF, TFF, TFT", "TTT, TTF, FFF, TFF", "TTF, FTF, TFF, TTT", "FFF, TTT, FTT, TFF"],
    answer: 0,
    explanation: "A: FTF/TTF (B=T, C=F). B: TFF/TTF (A=T, C=F). C: TFF/TFT (A && B = F). The other sets each lack a pair: the second has none for A, the third none for C (TTF and TTT are both TRUE), and the fourth none for any condition."
  },
  {
    id: "v05", module: "mcdc", level: "expert",
    q: "A decision has 4 independent conditions. What are the minimum test counts for MC/DC and for multiple condition coverage (all combinations)?",
    options: ["5 and 16", "4 and 8", "8 and 16", "5 and 32"],
    answer: 0,
    explanation: "MC/DC needs at least N + 1 = 5 tests; multiple condition coverage needs all 2^N = 16 combinations. DO-178C requires MC/DC for Level A, not multiple condition coverage."
  },
  {
    id: "v06", module: "mcdc", level: "expert",
    q: "In C, `if (A && B)` is tested with A = FALSE. How is B normally treated in the MC/DC analysis of that test?",
    options: [
      "As 'don't care': B is not evaluated, so TT against F-x shows A's independence",
      "B must be TRUE in that test, otherwise the test is not valid",
      "B must be FALSE in that test, so that the pair is unique",
      "The test must be discarded, since short-circuit code cannot reach MC/DC"
    ],
    answer: 0,
    explanation: "With && the right operand isn't evaluated when the left one is FALSE, so B can't influence the outcome in that test. Coverage tools and analyses commonly mark it as 'don't care'. This is also why MISRA C forbids side effects in the right operand."
  },
  {
    id: "v07", module: "mcdc", level: "expert",
    q: "In `(A && B) || (A && C)`, the two occurrences of A always change together. How can MC/DC be shown for each occurrence?",
    options: [
      "Use masking MC/DC: other conditions may change if their effect is masked, e.g. C = FALSE masks the second A",
      "It cannot be shown; coupled conditions are exempt from MC/DC",
      "Add a test that changes only the first A, leaving the second A unchanged",
      "Use multiple condition coverage, which DO-178C requires for coupled conditions"
    ],
    answer: 0,
    explanation: "Unique-cause pairs are impossible for coupled conditions. With masking MC/DC, (A=T, B=T, C=F) vs (A=F, B=T, C=F) shows the first A: the second A also changes, but A && C stays FALSE. State the MC/DC variant in your plans (see CAST-6)."
  },
  {
    id: "v08", module: "mcdc", level: "expert",
    q: "Is `alarm = valid && over_limit;` (an assignment, not an if statement) a decision for MC/DC purposes?",
    options: [
      "Yes: it is normally a decision, since it is a Boolean expression with Boolean operators",
      "No: only conditions of if, while and for statements are decisions",
      "Only at Level B, where decision coverage is the required criterion",
      "Only if the compiler turns the expression into a branch instruction"
    ],
    answer: 0,
    explanation: "DO-178C defines a decision as a Boolean expression made of conditions and Boolean operators, without restricting it to branch points. CAST-10 discusses this. Agree the interpretation and the tool settings in your plans."
  },
  {
    id: "v09", module: "mcdc", level: "expert",
    q: "What does MC/DC require for `if (ready)`, which has a single condition?",
    options: [
      "Two tests, ready TRUE and FALSE, which is the same as decision coverage",
      "Three tests, following N + 1 with N = 2 for the variable and its outcome",
      "One test, because there is no other condition to be independent of",
      "Four tests, to cover all bit patterns that the variable can hold"
    ],
    answer: 0,
    explanation: "With one condition, showing its independent effect means seeing both outcomes, so MC/DC equals decision coverage: N + 1 = 2."
  },
  {
    id: "v10", module: "mcdc", level: "expert",
    q: "What is the minimum number of tests for unique-cause MC/DC of `if (!(A && B))`?",
    options: ["3", "2", "4", "6"],
    answer: 0,
    explanation: "NOT doesn't add a condition. The decision has two conditions, so N + 1 = 3: TT (F), FT (T), TF (T)."
  },
  {
    id: "v11", module: "mcdc", level: "expert",
    q: "Level A coverage analysis shows no independence pair for condition B, and no requirement leads to a test with B = FALSE while the others allow B to decide. What is the correct first step?",
    options: [
      "Analyse why: a missing requirement, an inadequate test, or a redundant condition in the code",
      "Add a test that sets B = FALSE only to complete the pair",
      "Mark B as deactivated code, since no requirement calls for it",
      "Lower the component to Level B, so that MC/DC is no longer required"
    ],
    answer: 0,
    explanation: "Coverage analysis checks the completeness of requirements-based testing. The gap is resolved by fixing the requirement, the test or the code. A structure-only test would hide the real cause, and the software level is set by the safety assessment, not by coverage results."
  },
  {
    id: "v12", module: "mcdc", level: "expert",
    q: "What is the minimum number of tests for unique-cause MC/DC of `if (a_ok != b_ok)`, where both operands are Booleans (an XOR)?",
    options: ["3", "2", "4", "1"],
    answer: 0,
    explanation: "Changing either input of an XOR always flips the outcome. FF (F) vs TF (T) shows the first condition, and FF vs FT (T) shows the second: 3 tests."
  },
  {
    id: "v13", module: "mcdc", level: "expert",
    q: "For `if ((A && B) || C)`, what must hold in the two tests that show C's independent effect?",
    options: [
      "A && B must be FALSE in both tests, otherwise the OR is already TRUE and masks C",
      "A and B must both be TRUE in both tests, so that the AND is satisfied",
      "A must be TRUE and B FALSE, and only in that order",
      "Nothing special: C always affects the outcome of the decision"
    ],
    answer: 0,
    explanation: "If A && B is TRUE, the outcome is TRUE whatever C is. Any of FF, FT or TF for A, B works: FFF/FFT, FTF/FTT or TFF/TFT."
  },
  {
    id: "v14", module: "mcdc", level: "expert",
    q: "Code: `if (x > 10) { y = 1; }` with no else branch. A single test with x = 20 is run. What coverage does it give?",
    options: [
      "100 % statement coverage, but not decision coverage, since the FALSE outcome never ran",
      "100 % statement coverage and 100 % decision coverage, since every statement ran",
      "50 % statement coverage, since the else path has no statements to run",
      "Full MC/DC, because the decision has only one condition"
    ],
    answer: 0,
    explanation: "Every statement executes, but the decision only took the TRUE outcome. Decision coverage (Levels A and B) also needs a test with x <= 10, even though it executes no extra statement."
  },
  {
    id: "v15", module: "mcdc", level: "expert",
    q: "Which 4-test set achieves unique-cause MC/DC for `if (A || (B && C))`? (Tests are written as A B C.)",
    options: ["FTT, FFT, FTF, TTF", "TTT, FFF, FTT, TFF", "FTT, FFT, FTF, FFF", "TTT, TFF, FTT, FTF"],
    answer: 0,
    explanation: "B: FTT/FFT (A=F, C=T). C: FTT/FTF (A=F, B=T). A: FTF/TTF (B && C = F). The other sets lack a pair: the second for B and C, the third for A (A is never TRUE), and the fourth for A and B."
  },
  {
    id: "v16", module: "mcdc", level: "expert",
    q: "For `if ((x > 10) && (x > 5))`, no test can show an independence pair for `x > 5`. What does this most likely indicate?",
    options: [
      "A redundant condition: x > 10 implies x > 5, so the code or design needs fixing",
      "The coverage tool is faulty and its result should be disregarded",
      "More tests with larger values of x are needed to show the pair",
      "The condition must be handled with masking MC/DC instead"
    ],
    answer: 0,
    explanation: "Showing x > 5 independently needs x > 10 TRUE and x > 5 FALSE at the same time, which is impossible. Unachievable MC/DC often points to redundant or wrong logic. Review the requirement and the code rather than the tests."
  }
];
