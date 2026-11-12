/*
 * Question bank for the Embedded System Training quiz.
 *
 * Each question:
 *   id          unique string
 *   module      "c" | "mcu" | "comm" | "rtos"
 *   level       "beginner" | "intermediate" | "advanced"
 *   q           question text
 *   code        optional code snippet (shown in a <pre> block)
 *   options     exactly 4 answer strings
 *   answer      index (0-3) of the correct option in `options`
 *   explanation shown on the results screen
 *
 * Run `node tools/validate-questions.js` after editing.
 */
window.QUIZ_MODULES = {
  c:    "Embedded C Basics",
  mcu:  "MCU & Peripherals",
  comm: "Communication Protocols",
  rtos: "RTOS Fundamentals"
};

window.QUIZ_QUESTIONS = [
  /* ---------------- Module 1: Embedded C ---------------- */
  {
    id: "c01", module: "c", level: "beginner",
    q: "Which expression sets bit 3 of `reg` without changing the other bits?",
    options: ["reg |= (1U << 3);", "reg &= (1U << 3);", "reg ^= (1U << 3);", "reg = (1U << 3);"],
    answer: 0,
    explanation: "OR-ing with a mask sets the selected bit. `&=` would clear every other bit, `^=` toggles the bit, and `=` overwrites the whole register."
  },
  {
    id: "c02", module: "c", level: "beginner",
    q: "Which expression clears bit 3 of `reg`?",
    options: ["reg &= ~(1U << 3);", "reg |= ~(1U << 3);", "reg &= (1U << 3);", "reg ^= ~(1U << 3);"],
    answer: 0,
    explanation: "AND with the inverted mask clears only that bit and keeps all the others."
  },
  {
    id: "c03", module: "c", level: "beginner",
    q: "Why is `uint32_t` from <stdint.h> preferred over `unsigned int` for a 32-bit register value?",
    options: [
      "Its width is exactly 32 bits on every platform that provides it",
      "It is always faster than unsigned int",
      "It is stored in Flash instead of RAM",
      "It cannot overflow"
    ],
    answer: 0,
    explanation: "The width of `int` is implementation-defined (16 bits on some MCUs). `uint32_t` is exactly 32 bits wherever it exists."
  },
  {
    id: "c04", module: "c", level: "beginner",
    q: "What is the binary value of 0xA5?",
    options: ["1010 0101", "1010 1010", "0101 1010", "1011 0101"],
    answer: 0,
    explanation: "A = 1010 and 5 = 0101, so 0xA5 = 1010 0101."
  },
  {
    id: "c05", module: "c", level: "beginner",
    q: "What happens to a `static` local variable inside a function?",
    options: [
      "It keeps its value between calls to the function",
      "It is re-initialised on every call",
      "It is placed on the stack",
      "It becomes visible to other source files"
    ],
    answer: 0,
    explanation: "A static local has static storage duration (in .data or .bss), so it is initialised once and keeps its value between calls."
  },
  {
    id: "c06", module: "c", level: "intermediate",
    q: "What does the `volatile` qualifier tell the compiler?",
    options: [
      "The variable may change outside the normal program flow, so every access must really be performed",
      "Accesses to the variable are atomic",
      "The variable must be stored in Flash",
      "The variable is thread-safe without locking"
    ],
    answer: 0,
    explanation: "`volatile` stops the optimiser from caching or removing accesses. It does NOT make operations atomic or thread-safe."
  },
  {
    id: "c07", module: "c", level: "intermediate",
    q: "A flag is set in an ISR and polled in main(). With optimisation on, main loops forever even though the ISR runs. What is the most likely fix?",
    code: "bool flag = false;\nvoid ISR(void) { flag = true; }\nint main(void) { while (!flag) { } }",
    options: [
      "Declare the flag as volatile",
      "Declare the flag as const",
      "Declare the flag as static inside main",
      "Turn the flag into a local variable"
    ],
    answer: 0,
    explanation: "Without volatile the compiler may read `flag` once and keep it in a register, so it never sees the ISR's write."
  },
  {
    id: "c08", module: "c", level: "intermediate",
    q: "What value is stored in `sum`?",
    code: "uint8_t a = 200, b = 100;\nuint8_t sum = a + b;",
    options: ["44", "300", "255", "It is undefined behaviour"],
    answer: 0,
    explanation: "a + b is computed as int 300, then converted to uint8_t: 300 mod 256 = 44. Unsigned conversion is well defined."
  },
  {
    id: "c09", module: "c", level: "intermediate",
    q: "Where does an initialised global variable such as `int x = 5;` live at run time, and where does its initial value come from?",
    options: [
      "In RAM (.data); its initial value is copied from Flash by the startup code",
      "In Flash (.text) only",
      "On the stack of main()",
      "In RAM (.bss), zeroed at startup and then set to 5 by main()"
    ],
    answer: 0,
    explanation: "Initialised globals go to .data in RAM. The startup code copies their initial values from Flash before calling main()."
  },
  {
    id: "c10", module: "c", level: "advanced",
    q: "On a target with 32-bit int, why is `1U << 31` preferred over `1 << 31`?",
    options: [
      "Shifting a 1 into the sign bit of a signed int is undefined behaviour",
      "1U << 31 is evaluated at run time and is therefore more accurate",
      "1 << 31 always evaluates to 0",
      "There is no difference"
    ],
    answer: 0,
    explanation: "`1` is a signed int; shifting it into the sign bit overflows, which is undefined. With an unsigned operand the result is well defined (0x80000000)."
  },
  {
    id: "c11", module: "c", level: "advanced",
    q: "On a little-endian MCU, the 32-bit value 0x12345678 is stored at address 0x100. Which byte is at address 0x100?",
    options: ["0x78", "0x12", "0x34", "0x56"],
    answer: 0,
    explanation: "Little-endian stores the least-significant byte at the lowest address."
  },
  {
    id: "c12", module: "c", level: "advanced",
    q: "Why is `malloc`/`free` often avoided after initialisation in real-time embedded code?",
    options: [
      "Heap fragmentation and execution time that is hard to bound",
      "malloc is not part of the C standard",
      "Heap memory is always slower than stack memory",
      "The heap is stored in Flash"
    ],
    answer: 0,
    explanation: "Fragmentation can cause allocations to fail after long run times, and allocation time is not easily predictable. Static buffers or fixed-size pools are preferred."
  },

  /* ---------------- Module 2: MCU & Peripherals ---------------- */
  {
    id: "m01", module: "mcu", level: "beginner",
    q: "A push-button connects a GPIO input to GND when pressed. What else is needed for a reliable reading?",
    options: ["A pull-up resistor (internal or external)", "A pull-down resistor", "Nothing; a floating input is fine", "An open-drain output setting"],
    answer: 0,
    explanation: "When the button is released the pin would float. A pull-up holds it high (released = 1, pressed = 0)."
  },
  {
    id: "m02", module: "mcu", level: "beginner",
    q: "What is the key property of an open-drain output?",
    options: [
      "It can only actively pull the line low; a pull-up provides the high level",
      "It can only drive the line high",
      "It actively drives both high and low",
      "It is an analog output"
    ],
    answer: 0,
    explanation: "Open-drain outputs sink current only. That is why several devices can share one line (for example I2C) without short circuits."
  },
  {
    id: "m03", module: "mcu", level: "beginner",
    q: "You configure a peripheral's registers but it does not react at all. What is a very common cause on modern MCUs?",
    options: [
      "The peripheral clock has not been enabled",
      "The watchdog is enabled",
      "The variable is not volatile",
      "The stack is too large"
    ],
    answer: 0,
    explanation: "Most MCUs gate peripheral clocks to save power. The registers do not respond until the clock-enable bit is set."
  },
  {
    id: "m04", module: "mcu", level: "beginner",
    q: "Why do mechanical buttons need debouncing?",
    options: [
      "The contacts bounce, producing several transitions for one press",
      "Buttons need a high voltage to switch",
      "GPIO inputs cannot read buttons directly",
      "To reduce power consumption"
    ],
    answer: 0,
    explanation: "Contact bounce lasts a few milliseconds and looks like multiple presses unless it is filtered in software or hardware."
  },
  {
    id: "m05", module: "mcu", level: "intermediate",
    q: "An STM32-style timer runs from a 72 MHz clock with PSC = 7199 and ARR = 9999. What is the update (overflow) frequency?",
    options: ["1 Hz", "10 Hz", "10 kHz", "100 Hz"],
    answer: 0,
    explanation: "f = 72 MHz / ((7199+1)(9999+1)) = 72 000 000 / 72 000 000 = 1 Hz."
  },
  {
    id: "m06", module: "mcu", level: "intermediate",
    q: "A PWM channel has ARR = 999 and CCR = 250 (edge-aligned, STM32-style). What is the duty cycle?",
    options: ["25 %", "75 %", "2.5 %", "50 %"],
    answer: 0,
    explanation: "Duty = CCR / (ARR + 1) = 250 / 1000 = 25 %."
  },
  {
    id: "m07", module: "mcu", level: "intermediate",
    q: "A 12-bit ADC with a 3.3 V reference returns 2048. What is the approximate input voltage?",
    options: ["1.65 V", "3.3 V", "2.048 V", "0.8 V"],
    answer: 0,
    explanation: "V = 2048 × 3.3 / 4096 ≈ 1.65 V (half scale)."
  },
  {
    id: "m08", module: "mcu", level: "intermediate",
    q: "Which is good practice inside an interrupt service routine?",
    options: [
      "Keep it short: clear the flag, save data, signal the main code or a task",
      "Call printf to log every event",
      "Wait in a loop until the next event arrives",
      "Allocate a buffer with malloc"
    ],
    answer: 0,
    explanation: "ISRs should be short and non-blocking. Defer processing to main code or a task so interrupt latency stays low."
  },
  {
    id: "m09", module: "mcu", level: "intermediate",
    q: "You need to move 1024 ADC samples into a RAM buffer with minimum CPU load. What is the best mechanism?",
    options: ["DMA", "Polling the ADC end-of-conversion flag", "One interrupt per sample", "A software delay loop"],
    answer: 0,
    explanation: "DMA transfers data between peripherals and memory without the CPU handling each sample."
  },
  {
    id: "m10", module: "mcu", level: "advanced",
    q: "On ARM Cortex-M (NVIC), which interrupt has higher urgency: priority 1 or priority 5?",
    options: ["Priority 1", "Priority 5", "They are equal", "It depends on the vector table order only"],
    answer: 0,
    explanation: "On Cortex-M a lower numeric priority value means higher urgency."
  },
  {
    id: "m11", module: "mcu", level: "advanced",
    q: "Where is the most appropriate place to refresh (kick) a watchdog?",
    options: [
      "In the main loop or a supervisor task, only after confirming all parts of the system are healthy",
      "In a periodic timer ISR that always runs",
      "Immediately after reset only",
      "Inside every function call"
    ],
    answer: 0,
    explanation: "If a timer ISR kicks the watchdog, it keeps running even when the main code has hung, which defeats the purpose."
  },
  {
    id: "m12", module: "mcu", level: "advanced",
    q: "To sample a signal whose highest frequency component is 5 kHz without aliasing, the sample rate must be:",
    options: ["Greater than 10 kHz", "Exactly 5 kHz", "Greater than 2.5 kHz", "Any rate, if the ADC has 12 bits"],
    answer: 0,
    explanation: "Nyquist: the sample rate must be more than twice the highest frequency present. In practice, also use an anti-aliasing filter."
  },

  /* ---------------- Module 3: Communication Protocols ---------------- */
  {
    id: "p01", module: "comm", level: "beginner",
    q: "How are two UART devices connected for full-duplex communication?",
    options: [
      "TX to RX, RX to TX, and a common ground",
      "TX to TX, RX to RX",
      "TX to RX only; ground is not needed",
      "Through SDA and SCL"
    ],
    answer: 0,
    explanation: "One device's transmit line goes to the other's receive line, and a shared ground gives both a voltage reference."
  },
  {
    id: "p02", module: "comm", level: "beginner",
    q: "How many bits are on the line per byte in UART 8N1 format?",
    options: ["10", "8", "9", "11"],
    answer: 0,
    explanation: "1 start + 8 data + 0 parity + 1 stop = 10 bits."
  },
  {
    id: "p03", module: "comm", level: "beginner",
    q: "Which protocol uses only two signal lines (data and clock) and addresses devices by a 7-bit address?",
    options: ["I2C", "SPI", "UART", "CAN"],
    answer: 0,
    explanation: "I2C uses SDA and SCL and selects devices by address. SPI uses a separate chip-select line per device."
  },
  {
    id: "p04", module: "comm", level: "beginner",
    q: "In SPI, which signal selects which peripheral the controller talks to?",
    options: ["CS (chip select)", "MISO", "SCLK", "An address byte"],
    answer: 0,
    explanation: "The controller pulls the target device's CS line (usually active low) to select it."
  },
  {
    id: "p05", module: "comm", level: "intermediate",
    q: "Approximately how long does it take to send 100 bytes at 9600 baud, 8N1?",
    options: ["About 104 ms", "About 83 ms", "About 10 ms", "About 1 s"],
    answer: 0,
    explanation: "100 bytes × 10 bits = 1000 bits; 1000 / 9600 ≈ 0.104 s."
  },
  {
    id: "p06", module: "comm", level: "intermediate",
    q: "What do CPOL and CPHA define in SPI?",
    options: [
      "The clock idle level and which clock edge samples data",
      "The baud rate and parity",
      "The device address and R/W bit",
      "The voltage levels of MOSI and MISO"
    ],
    answer: 0,
    explanation: "CPOL is the idle clock polarity and CPHA is the clock phase. Together they give SPI modes 0–3."
  },
  {
    id: "p07", module: "comm", level: "intermediate",
    q: "Why do I2C lines need pull-up resistors?",
    options: [
      "Devices drive the lines with open-drain outputs that can only pull low",
      "To limit the bus speed to 100 kHz",
      "To terminate reflections like CAN",
      "They are only needed for 10-bit addressing"
    ],
    answer: 0,
    explanation: "Open-drain drivers only pull low. The pull-ups return the lines to high, which allows wired-AND arbitration and clock stretching."
  },
  {
    id: "p08", module: "comm", level: "intermediate",
    q: "What defines an I2C START condition?",
    options: [
      "SDA goes from high to low while SCL is high",
      "SCL goes low while SDA is high",
      "SDA goes from low to high while SCL is high",
      "Both lines are held low for 1 ms"
    ],
    answer: 0,
    explanation: "START: SDA falls while SCL is high. STOP: SDA rises while SCL is high. Normally SDA changes only while SCL is low."
  },
  {
    id: "p09", module: "comm", level: "intermediate",
    q: "A datasheet lists a sensor's I2C address as 0x90 (write) / 0x91 (read). What is the 7-bit address?",
    options: ["0x48", "0x90", "0x91", "0x45"],
    answer: 0,
    explanation: "Those values include the R/W bit. Shift right by one: 0x90 >> 1 = 0x48."
  },
  {
    id: "p10", module: "comm", level: "advanced",
    q: "Two CAN nodes start sending frames with standard IDs 0x100 and 0x0FF at the same time. What happens?",
    options: [
      "The frame with ID 0x0FF wins arbitration and is sent intact",
      "The frame with ID 0x100 wins arbitration",
      "Both frames are corrupted and both nodes retry",
      "The bus enters bus-off state"
    ],
    answer: 0,
    explanation: "Dominant (0) bits overwrite recessive (1) bits, so the lower identifier wins non-destructive bitwise arbitration."
  },
  {
    id: "p11", module: "comm", level: "advanced",
    q: "A correctly terminated high-speed CAN bus is measured between CAN_H and CAN_L with the power off. What resistance do you expect?",
    options: ["About 60 Ω", "About 120 Ω", "About 240 Ω", "Open circuit"],
    answer: 0,
    explanation: "There is a 120 Ω terminator at each end, and two 120 Ω resistors in parallel give 60 Ω."
  },
  {
    id: "p12", module: "comm", level: "advanced",
    q: "What is the maximum data payload of a single Classic CAN frame compared with CAN FD?",
    options: ["8 bytes vs 64 bytes", "8 bytes vs 32 bytes", "64 bytes vs 256 bytes", "16 bytes vs 64 bytes"],
    answer: 0,
    explanation: "Classic CAN carries up to 8 data bytes. CAN FD increases this to 64 bytes and allows a faster data-phase bit rate."
  },

  /* ---------------- Module 4: RTOS ---------------- */
  {
    id: "r01", module: "rtos", level: "beginner",
    q: "What does 'real-time' mean in a real-time operating system?",
    options: [
      "Responses are predictable and meet their deadlines",
      "The CPU always runs at maximum frequency",
      "The system shows the time of day",
      "Every task runs at the same time"
    ],
    answer: 0,
    explanation: "Real-time is about determinism and meeting deadlines, not raw speed."
  },
  {
    id: "r02", module: "rtos", level: "beginner",
    q: "A task calls vTaskDelay(). Which state does it enter?",
    options: ["Blocked", "Running", "Ready", "Deleted"],
    answer: 0,
    explanation: "The task is blocked until the delay expires and uses no CPU time meanwhile. Then it becomes Ready."
  },
  {
    id: "r03", module: "rtos", level: "beginner",
    q: "In a pre-emptive priority-based RTOS, which task runs?",
    options: [
      "The highest-priority task that is in the Ready state",
      "The task that was created first",
      "The task with the largest stack",
      "Tasks always run in strict round-robin order regardless of priority"
    ],
    answer: 0,
    explanation: "The scheduler always picks the highest-priority Ready task. Equal-priority tasks may be time-sliced."
  },
  {
    id: "r04", module: "rtos", level: "beginner",
    q: "Which RTOS object is best for passing sensor readings (data) from one task to another?",
    options: ["Queue", "Mutex", "Binary semaphore", "Idle task"],
    answer: 0,
    explanation: "A queue carries data items (FreeRTOS copies them in). Semaphores only signal and mutexes protect resources."
  },
  {
    id: "r05", module: "rtos", level: "intermediate",
    q: "Which is the best choice to protect a shared SPI bus used by several tasks?",
    options: ["Mutex", "Binary semaphore given from an ISR", "Event group", "Software timer"],
    answer: 0,
    explanation: "A mutex provides mutual exclusion with ownership, and in FreeRTOS it applies priority inheritance."
  },
  {
    id: "r06", module: "rtos", level: "intermediate",
    q: "An ISR must wake a task when a UART frame is received (FreeRTOS). What should the ISR use?",
    options: [
      "xSemaphoreGiveFromISR() (or xQueueSendFromISR()), then portYIELD_FROM_ISR() if needed",
      "xSemaphoreTake() with portMAX_DELAY",
      "vTaskDelay(1)",
      "A mutex taken inside the ISR"
    ],
    answer: 0,
    explanation: "Inside ISRs only use the ...FromISR API variants, which never block. Request a context switch if a higher-priority task was woken."
  },
  {
    id: "r07", module: "rtos", level: "intermediate",
    q: "A task must run exactly every 10 ms without its period drifting. Which FreeRTOS call is most appropriate?",
    options: ["vTaskDelayUntil()", "vTaskDelay()", "vTaskSuspend()", "taskYIELD()"],
    answer: 0,
    explanation: "vTaskDelay is relative to the moment it is called, so the period drifts by the execution time. vTaskDelayUntil wakes at absolute period boundaries."
  },
  {
    id: "r08", module: "rtos", level: "intermediate",
    q: "What happens during a context switch?",
    options: [
      "The CPU registers of the current task are saved and those of the next task are restored",
      "The MCU is reset",
      "All interrupts are permanently disabled",
      "The task stack is copied into Flash"
    ],
    answer: 0,
    explanation: "Each task's context (registers, stack pointer) is saved, usually on its own stack, so it can resume later exactly where it stopped."
  },
  {
    id: "r09", module: "rtos", level: "advanced",
    q: "A high-priority task waits for a mutex held by a low-priority task, which is being pre-empted by a medium-priority task. What is this called, and what is a standard fix?",
    options: [
      "Priority inversion; priority inheritance",
      "Deadlock; increase the tick rate",
      "Starvation; use a larger stack",
      "Race condition; mark variables volatile"
    ],
    answer: 0,
    explanation: "This is unbounded priority inversion. Priority inheritance temporarily raises the mutex holder to the waiting task's priority."
  },
  {
    id: "r10", module: "rtos", level: "advanced",
    q: "Task A holds lock L1 and waits for L2, while task B holds L2 and waits for L1. Which technique prevents this?",
    options: [
      "Always acquire locks in the same global order",
      "Give both tasks the same priority",
      "Make the lock variables volatile",
      "Increase the stack size of both tasks"
    ],
    answer: 0,
    explanation: "This is a deadlock caused by circular waiting. A consistent lock ordering removes the circular wait."
  },
  {
    id: "r11", module: "rtos", level: "advanced",
    q: "Under rate-monotonic scheduling, how are fixed priorities assigned?",
    options: [
      "Shorter period → higher priority",
      "Longer execution time → higher priority",
      "Earlier creation → higher priority",
      "All tasks get the same priority"
    ],
    answer: 0,
    explanation: "Rate-monotonic assigns higher priority to tasks with higher rates (shorter periods)."
  },
  {
    id: "r12", module: "rtos", level: "advanced",
    q: "Which FreeRTOS feature helps you measure how close a task came to overflowing its stack?",
    options: [
      "uxTaskGetStackHighWaterMark()",
      "vTaskDelayUntil()",
      "xQueueReset()",
      "configTICK_RATE_HZ"
    ],
    answer: 0,
    explanation: "The high-water mark reports the minimum free stack space seen since the task started. Combine it with configCHECK_FOR_STACK_OVERFLOW during development."
  }
];
