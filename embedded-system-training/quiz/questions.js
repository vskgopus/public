/*
 * Expert question bank for the Embedded System Training quiz
 * (target audience: embedded software engineers with 3+ years of experience).
 *
 * Each question:
 *   id          unique string (prefix per module: c, m, p, r, d)
 *   module      "c" | "mcu" | "comm" | "rtos" | "do178c"
 *   level       "expert"
 *   q           question text (`backticks` render as inline code)
 *   code        optional code snippet (shown in a <pre> block)
 *   options     exactly 4 distinct answer strings
 *   answer      index (0-3) of the correct option in `options` (options are shuffled at run time)
 *   explanation shown on the results screen
 *
 * Run `npm run validate` after editing.
 */
window.QUIZ_MODULES = {
  c:      "Embedded C",
  mcu:    "MCU & Peripherals",
  comm:   "Communication Protocols",
  rtos:   "RTOS",
  do178c: "DO-178C"
};

window.QUIZ_QUESTIONS = [
  /* ---------------- Module 1: Embedded C ---------------- */
  {
    id: "c01", module: "c", level: "expert",
    q: "On a target with 32-bit `int`, what does this condition evaluate to?",
    code: "uint16_t a = 0xFFFFU, b = 1U;\nif ((a + b) == 0U) { /* ... */ }",
    options: [
      "False: a and b are promoted to int, so the sum is 65536",
      "True: uint16_t arithmetic wraps to 0",
      "Undefined behaviour because of unsigned overflow",
      "Implementation-defined; most compilers make it true"
    ],
    answer: 0,
    explanation: "Both operands are promoted to (signed) int before the addition, so the result is int 65536, not 0. On a 16-bit-int target, the same code would wrap to 0 and the condition would be true, which is why MISRA's essential type rules flag it."
  },
  {
    id: "c02", module: "c", level: "expert",
    q: "Why is this comparison false on a 32-bit-int target?",
    code: "uint8_t x = 0x0FU;\nif (~x == 0xF0U) { /* never taken */ }",
    options: [
      "x is promoted to int before `~`, so `~x` is 0xFFFFFFF0, not 0xF0",
      "`~` is not allowed on unsigned types",
      "0xF0U is a 16-bit constant",
      "The comparison is undefined behaviour"
    ],
    answer: 0,
    explanation: "Integer promotion happens before the bitwise complement. Casting the result back, as in `(uint8_t)~x`, gives 0xF0. MISRA C requires such results to be cast to the essential type that was intended."
  },
  {
    id: "c03", module: "c", level: "expert",
    q: "A developer writes an overflow guard for a signed addition. What can an optimising compiler legally do with it?",
    code: "int32_t add100(int32_t a) {\n    if (a + 100 < a) { return INT32_MAX; }\n    return a + 100;\n}",
    options: [
      "Remove the check entirely, because signed overflow is undefined behaviour and the compiler may assume it never happens",
      "Nothing; the check always works",
      "Convert the check into an unsigned comparison",
      "Insert a run-time trap automatically"
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
      "volatile doesn't order the non-volatile write to `data`, or prevent hardware reordering. Use release/acquire atomics or memory barriers.",
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
      "Mandatory rules can't be deviated; Required rules need a formal, documented deviation; Advisory rules are recommendations",
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
      "Worst-case stack usage can't be bounded by static analysis in general",
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
      "12 bytes, because of padding for alignment. Don't overlay such structs on wire data.",
      "6 bytes; members are packed by default",
      "8 bytes; the compiler reorders members to minimise padding",
      "Exactly 6 bytes on every platform, by the C standard"
    ],
    answer: 0,
    explanation: "With 4-byte alignment for uint32_t, a sits at offset 0, b at 4 and c at 8, and the size is rounded up to 12. C doesn't allow member reordering, and padding is implementation-defined. Parse messages field by field."
  },
  {
    id: "c09", module: "c", level: "expert",
    q: "What is wrong with this code?",
    code: "#define MAX(a, b) ((a) > (b) ? (a) : (b))\nm = MAX(i++, j);",
    options: [
      "i may be incremented twice. Use a static inline function instead.",
      "Nothing; the parentheses make the macro safe",
      "It is a syntax error",
      "The result is always j"
    ],
    answer: 0,
    explanation: "The macro argument is expanded twice, so the side effect runs twice when i++ is the larger value. Function-like macros with side-effecting arguments are restricted by MISRA C."
  },
  {
    id: "c10", module: "c", level: "expert",
    q: "Two Q15 values, both -32768 (= -1.0), are multiplied as `((int32_t)a * b) >> 15`. What must the code handle?",
    options: [
      "The result is +32768, which doesn't fit in int16_t, so it must be saturated to 32767",
      "Nothing; Q15 multiplication never overflows",
      "The 32-bit product overflows",
      "The shift should be by 16, not 15"
    ],
    answer: 0,
    explanation: "-1 × -1 = +1.0, which isn't representable in Q15 (maximum about 0.99997). The 32-bit product (2^30) is fine; the problem is narrowing back to 16 bits, so saturate."
  },
  {
    id: "c11", module: "c", level: "expert",
    q: "A static stack-analysis tool reports an incomplete call graph for a module. What is the most likely cause?",
    options: [
      "Calls through function pointers, which the tool can't resolve without annotations",
      "Use of `static inline` functions",
      "Use of `const` lookup tables",
      "Functions with more than four parameters"
    ],
    answer: 0,
    explanation: "Indirect calls hide the call targets. Most analysers need the possible targets annotated (or the design restricted) to compute worst-case stack depth."
  },
  {
    id: "c12", module: "c", level: "expert",
    q: "Which statement is undefined behaviour?",
    options: ["i = i++ + 1;", "i = i + 1;", "i += 1;", "j = i++ + 1;"],
    answer: 0,
    explanation: "In `i = i++ + 1;`, i is modified twice without sequencing, which is undefined. The other statements modify i at most once."
  },

  /* ---------------- Module 2: MCU & Peripherals ---------------- */
  {
    id: "m01", module: "mcu", level: "expert",
    q: "On a Cortex-M7 with D-cache enabled, a UART DMA receive buffer sometimes contains old data when the CPU reads it after the transfer completes. What is the correct fix?",
    options: [
      "Invalidate the buffer's cache lines after the DMA completes, with the buffer aligned and sized to 32-byte cache lines (or place it in a non-cacheable region)",
      "Clean the cache lines after the DMA completes",
      "Declare the buffer volatile",
      "Add a delay before reading the buffer"
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
      "The flag-clearing write hadn't completed when the exception returned. Read the register back or execute DSB before returning.",
      "The NVIC priority is too high; lower it",
      "The ISR must be declared volatile",
      "Tail-chaining is broken; disable it"
    ],
    answer: 0,
    explanation: "Writes can sit in a write buffer or bus bridge. If the interrupt is still asserted when the exception returns, it is taken again. Arm and MCU vendors recommend a DSB or a read-back."
  },
  {
    id: "m04", module: "mcu", level: "expert",
    q: "Main code does `GPIOA->ODR |= LED1;` and an ISR does `GPIOA->ODR ^= LED2;`. LED2 occasionally fails to toggle. Best fix?",
    options: [
      "Use the atomic bit set/reset register (for example BSRR), or protect the read-modify-write",
      "Make ODR volatile",
      "Move the ISR to a higher priority",
      "Insert __NOP() after each write"
    ],
    answer: 0,
    explanation: "`|=` is read, modify, write. If the ISR runs between the read and the write, its update is overwritten. Atomic set/reset registers avoid the read entirely."
  },
  {
    id: "m05", module: "mcu", level: "expert",
    q: "What extra failure does a windowed watchdog detect compared with a simple watchdog?",
    options: [
      "Refreshes that come too early, for example from a runaway loop that kicks it continuously",
      "Stack overflow",
      "Brown-out conditions",
      "Corrupted flash"
    ],
    answer: 0,
    explanation: "A windowed watchdog resets the MCU if it is refreshed before the window opens, as well as when the refresh comes too late."
  },
  {
    id: "m06", module: "mcu", level: "expert",
    q: "How can an MPU turn a silent stack overflow into an immediately detectable fault?",
    options: [
      "Place a small no-access guard region just past the end of each stack",
      "Mark the stack region as execute-never",
      "Make the stack read-only",
      "Enable the MPU background region"
    ],
    answer: 0,
    explanation: "Any access into the guard region raises a MemManage fault at the moment of overflow, instead of corrupting adjacent data."
  },
  {
    id: "m07", module: "mcu", level: "expert",
    q: "After writing `MPU->CTRL` to enable the MPU, Arm recommends `__DSB(); __ISB();`. Why?",
    options: [
      "To make sure the configuration write has completed and that later instructions are fetched and executed with the new settings",
      "To flush the data cache",
      "To re-enable interrupts",
      "To reset the pipeline counters"
    ],
    answer: 0,
    explanation: "DSB waits for the write to complete. ISB flushes the pipeline so that instructions already fetched under the old configuration are re-fetched."
  },
  {
    id: "m08", module: "mcu", level: "expert",
    q: "Which mechanism provides a lock-free atomic read-modify-write on Armv7-M (for example Cortex-M3/M4) without disabling interrupts?",
    options: [
      "LDREX/STREX exclusive access, retried if the store fails",
      "The volatile keyword",
      "The WFI instruction",
      "Bit-banding is the only option"
    ],
    answer: 0,
    explanation: "Exclusive load/store with the local monitor detects intervening accesses (including exception entry) and lets the code retry. Armv6-M cores (Cortex-M0/M0+) don't have these instructions."
  },
  {
    id: "m09", module: "mcu", level: "expert",
    q: "Why is a March test (for example March C−) preferred over a simple write/read pattern for power-up RAM test?",
    options: [
      "It detects stuck-at, transition and many coupling faults by walking ordered read/write sequences up and down memory",
      "It is faster than any other test",
      "It doesn't need to write to memory",
      "It also checks flash memory"
    ],
    answer: 0,
    explanation: "March algorithms apply ordered sequences in ascending and descending address order, which exposes faults where one cell affects another. A single pattern can miss these."
  },
  {
    id: "m10", module: "mcu", level: "expert",
    q: "What is the purpose of memory scrubbing in an ECC-protected RAM?",
    options: [
      "Periodically reading and correcting memory so that single-bit upsets don't build up into uncorrectable multi-bit errors",
      "Erasing memory before power-down for security",
      "Measuring RAM access time",
      "Defragmenting the heap"
    ],
    answer: 0,
    explanation: "Single-event upsets (for example from radiation at altitude) are corrected only when a word is read. Scrubbing reads every word regularly, so errors are corrected before a second upset hits the same word."
  },
  {
    id: "m11", module: "mcu", level: "expert",
    q: "Enabling instruction and data caches on a control processor has what effect on certification-relevant timing evidence?",
    options: [
      "Average execution time improves, but worst-case timing becomes harder to bound and needs analysis, stress measurement with margin, or cache control",
      "WCET always improves by the same factor as the average",
      "Caches make execution time fully deterministic",
      "Caches have no effect on timing evidence"
    ],
    answer: 0,
    explanation: "Execution time then depends on cache state and history. Worst-case evidence must take this into account, for example through static analysis that models the cache, worst-case measurements or cache locking."
  },
  {
    id: "m12", module: "mcu", level: "expert",
    q: "Your hardware team switches to a new silicon revision of the same MCU late in the program. What should the software team do first?",
    options: [
      "Review the new revision's errata sheet against every peripheral and workaround used, and assess the impact on verification evidence",
      "Nothing; same part number means identical behaviour",
      "Only re-run the unit tests on a PC",
      "Rewrite the drivers from scratch"
    ],
    answer: 0,
    explanation: "Errata (and fixes) differ between silicon revisions. Workarounds may become unnecessary or new issues may appear. In a certified project, a hardware change also triggers a change impact analysis."
  },

  /* ---------------- Module 3: Communication Protocols ---------------- */
  {
    id: "p01", module: "comm", level: "expert",
    q: "A CAN node's transmit error counter (TEC) reaches 256. What state is it in?",
    options: [
      "Bus-off: it must not take part in bus traffic until it recovers",
      "Error passive",
      "Error active",
      "Sleep mode"
    ],
    answer: 0,
    explanation: "A node becomes error passive when TEC or REC exceeds 127, and bus-off when TEC exceeds 255. Recovery from bus-off follows the protocol's recovery sequence and the application's policy."
  },
  {
    id: "p02", module: "comm", level: "expert",
    q: "A faulty CAN node continuously transmits valid, correctly formed frames with ID 0x001. What happens?",
    options: [
      "Error confinement doesn't stop it; it starves lower-priority traffic. A bus guardian or an architectural mitigation is needed.",
      "The other nodes' error counters push it into bus-off within milliseconds",
      "The CAN controller automatically limits each ID to 10 % bus load",
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
      "Those with the lowest identifiers",
      "All messages equally",
      "Only extended-ID frames"
    ],
    answer: 0,
    explanation: "Worst-case response time grows with interference from every higher-priority message, so the lowest-priority frames are affected most. Timing analysis must use worst-case frame lengths, including bit stuffing."
  },
  {
    id: "p04", module: "comm", level: "expert",
    q: "Why must CAN worst-case timing analysis use a stuffed frame length instead of the nominal frame length?",
    options: [
      "Bit stuffing inserts extra bits depending on the data, so the actual frame can be longer than nominal",
      "Stuffing shortens frames, so nominal length is pessimistic",
      "Stuffing only happens in CAN FD",
      "The ACK slot doubles the frame length"
    ],
    answer: 0,
    explanation: "After five consecutive equal bits a complementary bit is inserted, so the frame length depends on the content. Analysis uses the worst-case stuffed length."
  },
  {
    id: "p05", module: "comm", level: "expert",
    q: "Which statement about an ARINC 429 word is correct?",
    options: [
      "It is 32 bits, with an 8-bit label in bits 1–8 identifying the parameter, and odd parity in bit 32",
      "It is 16 bits with a CRC-8",
      "It is 32 bits with even parity and a 4-bit label",
      "Its length is variable, up to 256 bits"
    ],
    answer: 0,
    explanation: "ARINC 429 uses 32-bit words: label (bits 1–8), SDI, data, SSM and an odd parity bit (bit 32)."
  },
  {
    id: "p06", module: "comm", level: "expert",
    q: "What is the topology of an ARINC 429 bus?",
    options: [
      "Unidirectional: one transmitter and multiple receivers. Two-way exchange needs two buses.",
      "Multi-master with arbitration, like CAN",
      "Command/response with a bus controller",
      "Switched full-duplex Ethernet"
    ],
    answer: 0,
    explanation: "Each ARINC 429 bus has exactly one transmitter. Command/response with a bus controller describes MIL-STD-1553B, and switched Ethernet describes AFDX."
  },
  {
    id: "p07", module: "comm", level: "expert",
    q: "Which description matches MIL-STD-1553B?",
    options: [
      "1 Mbit/s, command/response with a bus controller and up to 31 remote terminals, usually dual-redundant",
      "100 kbit/s, unidirectional, label-based",
      "Up to 1 Mbit/s, multi-master with bitwise arbitration",
      "Switched Ethernet with virtual links"
    ],
    answer: 0,
    explanation: "MIL-STD-1553B is a deterministic command/response bus. The bus controller initiates all transfers, and buses A and B provide redundancy."
  },
  {
    id: "p08", module: "comm", level: "expert",
    q: "How does AFDX (ARINC 664 Part 7) provide deterministic latency over Ethernet?",
    options: [
      "Traffic is sent on virtual links whose bandwidth is limited by a Bandwidth Allocation Gap (BAG), through statically configured switches",
      "CSMA/CD collision detection with priority back-off",
      "Token passing between end systems",
      "It doesn't; AFDX latency is unbounded"
    ],
    answer: 0,
    explanation: "Each virtual link has a minimum interval between frames (BAG) and a maximum frame size, so worst-case switch queuing and latency can be bounded. Redundant networks A and B add availability."
  },
  {
    id: "p09", module: "comm", level: "expert",
    q: "A sender's software hangs but its communication controller keeps retransmitting the last valid frame. Which receiver-side mechanism detects this?",
    options: [
      "A sequence (alive) counter in the payload that must change with every frame",
      "The CRC",
      "Parity checking",
      "A larger receive buffer"
    ],
    answer: 0,
    explanation: "The repeated frame is valid, so CRC and parity pass. Only a changing counter, or a freshness check on it, reveals stale data."
  },
  {
    id: "p10", module: "comm", level: "expert",
    q: "What is the safest way to decode a received byte buffer into message fields?",
    options: [
      "Check the length, then assemble each field explicitly with shifts in the defined byte order, then range-check the values",
      "Cast the buffer pointer to a packed struct pointer",
      "memcpy the buffer into a struct and use it directly",
      "Use a union of the byte array and a struct"
    ],
    answer: 0,
    explanation: "Struct overlays depend on padding, endianness and alignment (unaligned access can fault), and casts break strict aliasing. Explicit decoding is portable and reviewable."
  },
  {
    id: "p11", module: "comm", level: "expert",
    q: "After a processor reset during an I2C read, the bus stays busy because a slave holds SDA low. Standard recovery?",
    options: [
      "Clock SCL (up to about 9 pulses) until the slave releases SDA, then generate a STOP condition",
      "Drive SDA high with push-pull output",
      "Increase the pull-up resistor value",
      "Wait for the slave's watchdog"
    ],
    answer: 0,
    explanation: "The slave is in the middle of sending a byte and waits for clocks. Extra SCL pulses let it finish. A STOP then resets the bus state. Never drive an open-drain bus push-pull."
  },
  {
    id: "p12", module: "comm", level: "expert",
    q: "A UART at 921 600 baud with one interrupt per byte loses data under CPU load. Which design is most robust?",
    options: [
      "DMA into a circular buffer, with an idle-line or receive-timeout interrupt to detect the end of a frame",
      "Raise the UART interrupt to the highest priority and leave everything else unchanged",
      "Poll the UART in the main loop",
      "Reduce the stop bits to 0.5"
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
      "Freedom from deadlock, and blocking limited to at most one critical section",
      "Zero blocking time",
      "Automatic WCET reduction",
      "Support for dynamic priorities"
    ],
    answer: 0,
    explanation: "Raising the holder to the resource ceiling prevents a task from being blocked by more than one lower-priority critical section, and rules out circular waits. Priority inheritance allows chained blocking and doesn't prevent deadlock."
  },
  {
    id: "r03", module: "rtos", level: "expert",
    q: "In a FreeRTOS Cortex-M port, an ISR calls `xQueueSendFromISR()` but its NVIC priority is numerically lower (more urgent) than `configMAX_SYSCALL_INTERRUPT_PRIORITY`. What is the risk?",
    options: [
      "The ISR can pre-empt kernel critical sections and corrupt RTOS data structures intermittently",
      "None; FromISR functions can be called from any priority",
      "The call is ignored silently",
      "The scheduler is disabled until reset"
    ],
    answer: 0,
    explanation: "The kernel masks interrupts only up to configMAX_SYSCALL_INTERRUPT_PRIORITY. Interrupts above it may run during kernel critical sections, so they must not call RTOS APIs. configASSERT can catch this in many ports."
  },
  {
    id: "r04", module: "rtos", level: "expert",
    q: "A binary semaphore protects a shared resource used by high-, medium- and low-priority tasks. The high-priority task sometimes misses deadlines. What is the most likely fix?",
    options: [
      "Replace it with a mutex, which provides priority inheritance",
      "Increase the tick rate",
      "Give all three tasks the same priority",
      "Use a larger queue"
    ],
    answer: 0,
    explanation: "Binary semaphores have no owner and no priority inheritance, so the medium task can pre-empt the low-priority holder indefinitely (unbounded priority inversion)."
  },
  {
    id: "r05", module: "rtos", level: "expert",
    q: "In ARINC 653, what does time partitioning guarantee?",
    options: [
      "Each partition runs only in its fixed windows within the major frame, so an overrunning partition can't take time from others",
      "All partitions share the CPU through priority-based pre-emption",
      "Partitions are scheduled by the health monitor on demand",
      "Each partition gets a dedicated core"
    ],
    answer: 0,
    explanation: "A static schedule of partition windows repeats every major frame. Within its window, a partition schedules its own processes."
  },
  {
    id: "r06", module: "rtos", level: "expert",
    q: "What is the role of the ARINC 653 health monitor?",
    options: [
      "Detect errors at process, partition and module level, and apply the configured recovery action",
      "Measure CPU temperature",
      "Schedule partitions",
      "Allocate memory to partitions at run time"
    ],
    answer: 0,
    explanation: "The health monitor handles faults such as deadline misses, memory violations and hardware errors, using configured responses such as restarting a process or partition, or stopping the module."
  },
  {
    id: "r07", module: "rtos", level: "expert",
    q: "Why do many high-criticality control systems use a cyclic executive instead of a pre-emptive RTOS?",
    options: [
      "The fixed, table-driven schedule is deterministic and simpler to analyse and verify",
      "It uses less flash in every case",
      "It handles sporadic events better",
      "Changing it is easier than changing a pre-emptive design"
    ],
    answer: 0,
    explanation: "A cyclic executive gives a fixed, repeatable timeline. The cost is flexibility: long activities must be split by hand to fit minor frames, and changes can ripple through the table."
  },
  {
    id: "r08", module: "rtos", level: "expert",
    q: "Which FreeRTOS approach guarantees that no task, queue or semaphore is ever allocated from the heap?",
    options: [
      "Use the ...CreateStatic() APIs with configSUPPORT_DYNAMIC_ALLOCATION set to 0",
      "Call vTaskDelete() for unused tasks",
      "Set configTOTAL_HEAP_SIZE to a large value",
      "Use only vTaskDelayUntil()"
    ],
    answer: 0,
    explanation: "With dynamic allocation disabled, the dynamic create APIs aren't compiled in, so heap use is impossible by construction."
  },
  {
    id: "r09", module: "rtos", level: "expert",
    q: "WCET for a task was taken as the maximum of 10 000 measured runs. Why might a certification reviewer challenge this?",
    options: [
      "Testing may never have exercised the worst-case path or cache state. Evidence needs worst-case stimulus, path coverage and a justified margin, or static analysis.",
      "10 000 runs is too many",
      "Measured values are always higher than real WCET",
      "WCET is not required for any software level"
    ],
    answer: 0,
    explanation: "A maximum observed time is a lower bound on the true WCET. Reviewers expect an argument that the worst case was actually provoked, or a static analysis."
  },
  {
    id: "r10", module: "rtos", level: "expert",
    q: "On a multicore processor, an application's WCET doubles when the other core runs a memory-intensive task. What is this called, and what guidance addresses it for airborne systems?",
    options: [
      "Interference through shared resources; addressed by CAST-32A and its successors, EASA AMC 20-193 and FAA AC 20-193",
      "Priority inversion; addressed by ARINC 429",
      "Cache coherency failure; addressed by MISRA C",
      "Clock drift; addressed by DO-254"
    ],
    answer: 0,
    explanation: "Shared caches, interconnects and memory controllers create interference channels between cores. Multicore guidance requires identifying, mitigating and verifying them."
  },
  {
    id: "r11", module: "rtos", level: "expert",
    q: "Why must a FreeRTOS mutex not be taken or given from an ISR?",
    options: [
      "Mutexes rely on task ownership and priority inheritance, which have no meaning in interrupt context",
      "Mutexes are slower than semaphores",
      "ISRs can't access global variables",
      "Mutexes can only be used by the idle task"
    ],
    answer: 0,
    explanation: "An ISR is not a task: it can't own a mutex, block, or inherit a priority. Use a binary semaphore, a queue or a task notification from ISRs."
  },
  {
    id: "r12", module: "rtos", level: "expert",
    q: "What is the best watchdog strategy in a multi-task system?",
    options: [
      "A supervisor task kicks the watchdog only after every critical task has checked in within its deadline",
      "Kick the watchdog from the tick interrupt",
      "Each task kicks the watchdog whenever it runs",
      "Kick the watchdog from the idle task only"
    ],
    answer: 0,
    explanation: "A tick-interrupt kick survives a hung task, and per-task kicks hide a single failed task. Supervised check-ins detect any critical task that stops progressing."
  },

  /* ---------------- Module 5: DO-178C ---------------- */
  {
    id: "d01", module: "do178c", level: "expert",
    q: "Who or what determines the software level (A–E) of an airborne software component?",
    options: [
      "The system safety assessment, based on the most severe failure condition the software can cause or contribute to",
      "The software team, based on code complexity",
      "The certification authority, based on the size of the aircraft",
      "The amount of testing budget available"
    ],
    answer: 0,
    explanation: "The level comes from the system process (ARP4754A/B with ARP4761). The failure condition category (catastrophic … no safety effect) maps to Levels A–E."
  },
  {
    id: "d02", module: "do178c", level: "expert",
    q: "What is the purpose of data coupling and control coupling analysis in DO-178C (Levels A–C)?",
    options: [
      "To confirm that requirements-based testing exercised the interfaces between software components as used in the integrated software",
      "To measure the coupling metrics of the design for maintainability",
      "To prove that no global variables are used",
      "To replace integration testing"
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
    explanation: "Criterion 3 covers verification tools that could only fail to detect an error. Once the output is used to eliminate or reduce other processes, Criterion 2 applies (TQL-4 at Levels A and B, TQL-5 at C and D)."
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
  }
];
