/* MCU & Peripherals: extra questions (m13 onward). Format and rules: see the header of questions.js. APPEND ONLY.
 * Register and peripheral names are generic or "STM32-style"; learners must check their own reference manual. */
window.QUIZ_ADD("mcu", [
  ["On a Cortex-M device, a numerically lower interrupt priority value means what?",
   null,
   [
     "Higher urgency: a lower number can pre-empt a higher one",
     "Lower urgency: a lower number is served after higher numbers",
     "The interrupt is disabled until the priority is written as zero",
     "The interrupt runs in privileged mode while others run unprivileged"
   ],
   "Arm Cortex-M priorities count down: 0 is the highest configurable priority. Only the upper implemented bits of the priority field are used, and priority grouping decides how many bits are pre-emption priority and how many are sub-priority. Reset, NMI and HardFault have fixed priorities above all configurable ones."],
  ["Why must clock frequency and flash wait states be changed in a specific order when raising the CPU clock?",
   null,
   [
     "Raise the wait states before switching to the faster clock",
     "Lower the wait states first to save power while the PLL settles",
     "The order never matters, because flash time scales with the clock",
     "Disable the PLL while the wait states are changed"
   ],
   "Flash access time is fixed in nanoseconds, so a higher frequency needs more wait states. Raise wait states first when speeding up, and lower them only after slowing down. The exact register and sequence are device-specific, so follow the reference manual."],
  ["A PLL-based clock is configured. What should the code do before switching the system clock to the PLL output?",
   null,
   [
     "Wait for the PLL to report lock, with a timeout and a fall-back",
     "Switch at once, because the PLL output is stable when enabled",
     "Disable all interrupts, because the PLL cannot run with them on",
     "Refresh the watchdog twice, which starts the PLL"
   ],
   "Until the PLL is locked its output is not a valid clock, so switching early can hang the core. A bounded wait with a defined failure path (stay on the internal oscillator, report a fault) is the robust pattern."],
  ["What is the purpose of a clock security system (CSS) feature found on many MCUs?",
   null,
   [
     "It detects an oscillator failure and switches to an internal clock",
     "It encrypts the clock signal to protect it from tampering",
     "It raises the oscillator frequency when the supply voltage drops",
     "It disables the watchdog while the oscillator is unstable"
   ],
   "A failed crystal otherwise stops the core or causes erratic timing. A monitor with a fall-back clock lets software react. The name and behaviour are vendor-specific, and the fall-back clock accuracy is usually much worse than the crystal's."],
  ["A GPIO pin configured as open-drain output is used on an I2C bus. Which statement is correct?",
   null,
   [
     "The pin can only pull low, and a pull-up resistor gives the high level",
     "The pin drives both high and low actively, so no pull-up is needed",
     "The pin can only be used as an input and never drives the line",
     "The pull-up is built into the driver, so any bus load is acceptable"
   ],
   "Open-drain outputs allow several devices to share a line (wired-AND). The line rises through the pull-up, so rise time depends on the pull-up value and bus capacitance. That is also why a faster I2C mode needs a smaller pull-up (within the current limit)."],
  ["A push-button input is read by polling every 1 ms. What is the best way to deal with contact bounce?",
   null,
   [
     "Accept a change only after several consecutive samples agree",
     "Read the pin once at start-up and assume it never changes",
     "Use an unfiltered edge interrupt, because bounce gives one edge",
     "Raise the CPU clock so the bounce is shorter than one cycle"
   ],
   "Mechanical contacts produce several edges over a short time (commonly up to some milliseconds, so check the switch datasheet). A counter-based filter or timed state machine gives a clean event. A hardware RC filter plus Schmitt trigger is another option."],
  ["An external asynchronous signal is read by logic clocked by the MCU. What problem can occur if it is sampled directly, and what is the usual remedy?",
   null,
   [
     "Metastability in the sampling flip-flop, cured by a two-flop synchroniser",
     "Stack overflow in the interrupt handler, cured by a larger stack",
     "Cache misses on the input register, cured by a cache flush",
     "Bit errors in flash, cured by enabling ECC on the code memory"
   ],
   "A signal that changes near the clock edge can leave a flip-flop in an undefined state for a while. A synchroniser chain gives it time to settle, at the cost of one or two clock cycles of latency. This is a hardware property that software must account for in timing budgets."],
  ["Which combination best prevents a floating input pin from causing spurious interrupts?",
   null,
   [
     "Set a pull-up or pull-down, or drive the pin, so it has a defined level",
     "Leave it unconnected and mask the interrupt in software only",
     "Connect it to a long unshielded wire acting as an antenna",
     "Configure it as an analogue output so it carries no logic level"
   ],
   "A floating CMOS input can drift and oscillate, causing extra current and spurious edges. Unused pins are normally set to a defined state (output low or input with pull). The exact recommendation is in the device's hardware design guide."],
  ["What does 'tail-chaining' mean on Arm Cortex-M?",
   null,
   [
     "A pending interrupt is entered without a full restack",
     "Two interrupts share one handler to save flash space",
     "The stack grows downward from the top of RAM",
     "The pipeline is flushed after every branch instruction"
   ],
   "Tail-chaining skips the pop/push of the context between two back-to-back exceptions, which reduces latency. The exact cycle counts depend on the core, so check the technical reference manual instead of relying on a general figure."],
  ["Why is `PendSV` typically given the lowest interrupt priority in an RTOS port for Cortex-M?",
   null,
   [
     "So the switch runs only after all other handlers have finished",
     "Because its handler is the shortest of all exceptions",
     "Because no other exception is able to pre-empt it",
     "Because the NVIC requires every exception to differ in priority"
   ],
   "A context switch requested from an ISR is pended and executed when no other exception is active. This keeps interrupt handlers short and avoids switching tasks while an ISR is half done."],
  ["What does the `SVC` instruction on Cortex-M typically provide in an RTOS?",
   null,
   [
     "A synchronous entry into privileged code",
     "A way to switch the FPU off between task switches",
     "A data memory barrier that covers the cache",
     "A way to change the byte order of a register"
   ],
   "`SVC` causes the SVCall exception immediately and deterministically, so unprivileged code can request services through a defined gate. Many RTOS ports also use it to launch the scheduler. Check your RTOS port documentation."],
  ["An MCU has MSP and PSP stack pointers. What is the common RTOS use?",
   null,
   [
     "Handlers use MSP; each task has its own PSP",
     "Both pointers are used by every task at the same time",
     "PSP is reserved for the debugger and the trace unit",
     "MSP is used only by floating-point code"
   ],
   "Handler mode always uses MSP. Thread mode can use PSP, so each task gets a private stack, and the kernel switches PSP at a context switch. This also reduces the stack depth each task needs to reserve for nested interrupts."],
  ["A HardFault occurs. Which information is the most useful to capture first?",
   null,
   [
     "The stacked frame and the fault status registers",
     "The time of day at which the fault was raised",
     "The free size of the heap at that moment",
     "The number of tasks that were running at the time"
   ],
   "On Cortex-M the hardware stacks R0–R3, R12, LR, PC and xPSR on entry. Together with the configurable fault status registers (for example CFSR, HFSR, MMFAR/BFAR where applicable) this usually identifies the faulting address and reason. A fault handler that only loops gives no evidence."],
  ["Why can an 'imprecise bus fault' report a PC that is not the faulting store instruction?",
   null,
   [
     "The store sat in a write buffer and the error came back late",
     "The CPU runs instructions out of order on every Cortex-M",
     "The PC register is always zero in a bus fault",
     "The compiler raises the fault at build time"
   ],
   "With write buffering the core continues while the bus transaction completes, so the fault is reported late. During debugging, a data synchronisation barrier after the store (or disabling buffering where possible) makes it precise. Behaviour depends on the core and configuration."],
  ["What does a priority grouping configuration of 'all bits pre-emption priority' mean?",
   null,
   [
     "Only pre-emption levels exist, with no sub-priority",
     "Interrupts can no longer pre-empt each other at all",
     "Every interrupt is given the same priority",
     "All interrupts are masked until the grouping is changed"
   ],
   "Priority grouping splits the implemented priority bits into pre-emption and sub-priority. Sub-priority only orders pending interrupts that have equal pre-emption priority and never causes pre-emption. RTOS ports usually require a specific grouping, so check the port notes."],
  ["What is an advantage of using `BASEPRI` instead of `PRIMASK` to protect an RTOS critical section on Cortex-M3/M4?",
   null,
   [
     "Interrupts above the set level are still served",
     "It also disables NMI and HardFault, which PRIMASK does not",
     "It is faster to write than a general-purpose register",
     "It also disables the debugger interface"
   ],
   "`BASEPRI` masks only interrupts at or below a given urgency, so the highest-priority interrupts stay live. This is how FreeRTOS-style ports separate kernel-aware and kernel-unaware interrupts (see the RTOS module). `BASEPRI` is not available on Armv6-M cores such as Cortex-M0."],
  ["A timer is used in PWM mode with an auto-reload value `ARR` and compare value `CCR` (STM32-style edge-aligned up-counting). What is the duty cycle?",
   null,
   [
     "About CCR / (ARR + 1)",
     "Always 50 %, whatever the register values",
     "CCR multiplied by ARR, as a fraction of the period",
     "ARR divided by CCR, as a fraction of the period"
   ],
   "In edge-aligned up-counting PWM the output is active while the counter is below CCR, and the period is ARR + 1 counts. The details (polarity, whether 100 % is reachable) are timer-specific and must be checked in the reference manual."],
  ["Why is dead time inserted between the high-side and low-side drive signals of a half-bridge?",
   null,
   [
     "To prevent shoot-through of both switches",
     "To lower the PWM frequency of the bridge",
     "To raise the supply voltage of the bridge",
     "To synchronise the ADC sampling with the PWM edges"
   ],
   "Power switches turn off more slowly than the logic edge. With no gap, both could conduct and short the supply. Advanced timers provide dead-time insertion in hardware, and a fault input to shut the outputs down, which are safety-relevant features."],
  ["A 16-bit free-running timer is used for input capture to measure a period. How is the wrap-around handled most simply?",
   "uint16_t period = (uint16_t)(capture_now - capture_prev);",
   [
     "Unsigned subtraction in the timer width gives the count across one wrap",
     "It cannot be handled in software and needs extra hardware",
     "Use a signed `int` and `abs` on the two captured values",
     "Reset the timer at every capture, since it then never wraps"
   ],
   "Modular arithmetic makes `new - old` correct across the wrap if less than one full period has elapsed. For longer periods, count overflows with an update interrupt or use a wider timer."],
  ["An ADC conversion gives noisy results when measuring a high-impedance source. What is the usual cause and fix?",
   null,
   [
     "The sampling capacitor cannot charge in time",
     "The ADC has too many bits and the extra bits are noisy",
     "The CPU clock is too slow, so the result is read late",
     "The reference voltage is too low and must be disconnected"
   ],
   "The ADC input stage needs the source to charge a sampling capacitor within the sampling window. A high source resistance with a short sampling time causes errors and channel cross-talk. The datasheet gives the maximum source impedance for each sampling time setting."],
  ["Why is an anti-aliasing filter placed before an ADC?",
   null,
   [
     "Components above half the sample rate fold into the band",
     "It increases the number of significant ADC bits",
     "It lowers the reference voltage of the converter",
     "It removes the need for offset calibration"
   ],
   "Sampling at fs maps energy above fs/2 into lower frequencies (aliasing). The filter must attenuate it before sampling. Oversampling and digital decimation relax the analogue filter's requirements."],
  ["A 12-bit ADC has a 3.3 V reference. What is the approximate size of 1 LSB?",
   null,
   [
     "About 0.8 mV (3.3 V / 4096)",
     "About 3.3 mV (3.3 V / 1000)",
     "About 0.08 mV (3.3 V / 40 000)",
     "About 8 mV (3.3 V / 400)"
   ],
   "One LSB is Vref / 2^N = 3.3 / 4096 ≈ 0.806 mV. Real accuracy is worse than the LSB because of offset, gain error, noise and non-linearity, which the datasheet specifies."]
]);
window.QUIZ_ADD("mcu", [
  ["Oversampling an ADC 16 times and averaging gives roughly how much more resolution, if the noise is uncorrelated and about 1 LSB rms?",
   null,
   [
     "About 2 bits, since 4× the samples gives about 1 bit (verify)",
     "16 extra bits, one for every sample that is averaged",
     "No change at all, because averaging never adds resolution",
     "About 8 extra bits, half of the number of samples"
   ],
   "For white noise, averaging N samples reduces noise by √N, which equals about 0.5 bit per doubling of N, so 4× gives about 1 bit and 16× about 2 bits. This depends on enough noise (dither) and on ADC non-linearity, so measure the result instead of assuming it."],
  ["The UART receive error rate rises when the MCU runs from its internal RC oscillator. What is the most likely cause?",
   null,
   [
     "Oscillator drift pushes the baud error too far",
     "UART data bits are always lost with an RC clock source",
     "An RC oscillator gives the baud generator too many bits",
     "The stop bit becomes longer as the oscillator warms up"
   ],
   "Asynchronous reception re-synchronises on each start bit and samples near the middle of each bit, so cumulative timing error across a frame must remain small (a few percent in total for 8N1, subject to the receiver's sampling). Use a crystal, calibrate the RC oscillator, or reduce the baud rate."],
  ["At 115 200 baud with 8N1 framing, about how many bytes per second can be transferred at most?",
   null,
   [
     "About 11 520, since each byte uses 10 bits on the wire",
     "About 14 400, since each byte uses 8 bits",
     "About 115 200, since one bit is sent per byte",
     "About 1 152, since each byte uses 100 bit times"
   ],
   "Each byte uses a start bit, 8 data bits and a stop bit, so 10 bit times. 115 200 / 10 = 11 520 bytes per second at best, ignoring gaps between bytes."],
  ["A UART receiver reports a framing error. What does it mean?",
   null,
   [
     "The stop bit was not at the expected high level",
     "The parity bit was correct, but the data was not",
     "The receive FIFO is empty, so there is nothing to read",
     "The transmitter is idle and has sent a break"
   ],
   "A framing error means the line was not at the stop level when expected. Typical causes are wrong baud rate or frame format, noise, or a long low (break). Count and handle these errors as part of the communication fault handling."],
  ["Which statement about SPI mode 0 (CPOL = 0, CPHA = 0) is correct?",
   null,
   [
     "The clock idles low and data is sampled on the rising edge",
     "The clock idles high and data is sampled on the rising edge",
     "The clock idles low and data is sampled on the falling edge",
     "There is no clock in mode 0"
   ],
   "CPOL sets the idle level and CPHA sets whether the first edge samples (0) or shifts (1). Mode 0 samples on the first (rising) edge after an idle-low clock. Always check the slave datasheet for its required mode, because mismatches give shifted or garbled data."],
  ["When a single SPI master talks to several slaves, what must be ensured about the MISO lines?",
   null,
   [
     "Only the selected slave drives MISO; the others tri-state it",
     "All slaves drive MISO at the same time, so the master votes",
     "MISO must be tied to MOSI on a multi-slave bus",
     "MISO is not needed once chip-selects are used"
   ],
   "Two devices driving the same line with different levels cause contention. Slaves that do not release MISO when deselected need an external buffer. Chip-select timing relative to the clock must also be respected."],
  ["An I2C master reads a sensor and sometimes gets 0xFF for every byte. The slave address and wiring are correct. A likely cause is?",
   null,
   [
     "The slave did not acknowledge, for example in reset",
     "The master has too many registers for the sensor",
     "The clock is too slow for the sensor to answer",
     "SPI is also enabled on the same pins"
   ],
   "With open-drain lines and pull-ups, an absent or unresponsive device leaves the data line high, so the master reads 0xFF. Check the ACK status, power sequence and start-up delay of the sensor, and treat a NACK as an error."],
  ["What is I2C clock stretching?",
   null,
   [
     "A slave holds SCL low to make the master wait",
     "The master raises the clock frequency during a transfer",
     "The bus switches to SPI mode",
     "The pull-ups are disconnected during a transfer"
   ],
   "A slave that needs more time can hold SCL low after receiving a byte. Masters must support this (including a timeout so that a stuck slave does not hang the system). Some hardware masters do not, which limits compatibility."],
  ["Why do two identical I2C devices with the same fixed 7-bit address need extra hardware?",
   null,
   [
     "Both would answer every transaction",
     "They never conflict, because each device checks the data first",
     "The master renumbers them automatically at start-up",
     "The bus supports only one device of each type"
   ],
   "I2C addressing is fixed per device (with optional hardware address pins). Identical addresses cause bus contention and corrupt data, so use an I2C multiplexer or a second bus."],
  ["A watchdog is configured to refresh from a periodic 1 ms task. What is the main weakness of this design?",
   null,
   [
     "A task that still runs keeps feeding it while control is stuck",
     "The watchdog needs a faster clock for a 1 ms task",
     "A watchdog cannot be refreshed from a periodic task",
     "It will always reset the system too early"
   ],
   "A refresh must depend on the health of the monitored work. Good designs use a supervisor that refreshes only after all critical tasks report in (with sequence or deadline checks). See the RTOS module for multi-task strategies."],
  ["Which statement about a flash memory write is correct for typical NOR flash?",
   null,
   [
     "Programming clears bits; only a sector erase sets them",
     "Any single bit can be rewritten freely at any time",
     "Erase works on one bit at a time, like programming",
     "Writes complete instantly and never need a delay"
   ],
   "NOR flash programming clears bits and erase sets a whole block, so a value update normally needs read, erase and rewrite of a block. Erase and program also take milliseconds and may stall code fetch from the same bank, which matters for real-time code (run it from RAM or use another bank)."],
  ["A parameter block is updated in flash every second. What is the risk, and what design reduces it?",
   null,
   [
     "Limited erase endurance wears out the cells; use wear levelling",
     "Flash cannot be written while the program is running",
     "The compiler disables flash writes after the first one",
     "There is no risk, because flash endurance is unlimited"
   ],
   "Flash is specified for a limited number of program/erase cycles (device-specific, so check the datasheet). Updating the same page every second would exceed it. Spread writes over several pages, write only on change, or use EEPROM or FRAM for frequent data."],
  ["Power fails while a parameter block is being written to flash. What is the standard defence against ending up with corrupted data?",
   null,
   [
     "Keep two CRC-checked copies and write the new one first",
     "Write the block twice in a row to the same place",
     "Use a bigger stack during the write operation",
     "Disable the CRC check to make the write faster"
   ],
   "A power loss can leave a half-written page. Redundant copies with integrity checks allow the start-up code to choose the newest valid one. A brown-out detector and enough hold-up energy to finish a write add protection."],
  ["Why do bootloaders often verify an application image with a CRC or signature before jumping to it?",
   null,
   [
     "To avoid running a corrupted or unauthorised image",
     "To speed up the start of the application",
     "To increase the amount of RAM that is available",
     "To change the byte order of the application image"
   ],
   "An interrupted update or a flash error leaves a bad image that could crash or behave unpredictably. A CRC detects accidental damage, whereas a cryptographic signature also detects deliberate modification. For certified software, the loading process and its integrity checks are part of the approved design."],
  ["What does a brown-out reset (BOR) circuit do?",
   null,
   [
     "It holds the MCU in reset while the supply is low",
     "It raises the supply voltage whenever it starts to fall",
     "It disables all interrupts permanently after a dip",
     "It erases the flash on every brown-out event"
   ],
   "Below the minimum operating voltage, logic and memory behave unpredictably, and flash writes can be corrupted. A BOR or supply supervisor forces a clean reset. The threshold and hysteresis are device-specific."],
  ["After start-up, reading the reset-cause register shows 'watchdog reset'. What is the correct handling in a safety-related system?",
   null,
   [
     "Record the cause and run the defined recovery logic",
     "Clear the flag and carry on as if nothing had happened",
     "Disable the watchdog for the next run",
     "Treat it as a normal power-on reset"
   ],
   "The reset cause is evidence of a fault. The requirements should say what to do (retain a log in non-volatile or no-init memory, limit restart attempts, enter a degraded mode). Reset loops need a defined limit."],
  ["Which feature allows an MCU's stack to be monitored for overflow with no per-access software cost?",
   null,
   [
     "A hardware stack-limit register or an MPU guard region",
     "A larger `printf` buffer in the stack area",
     "An extra `volatile` keyword on the stack pointer",
     "A software function called after every instruction"
   ],
   "Stack limit registers (for example on Armv8-M) or an MPU region at the bottom of each stack trap an overflow at the moment it happens, with no code overhead. A canary pattern checked periodically detects it only afterwards."],
  ["A DMA channel in circular mode fills a buffer with ADC samples. Which technique lets the CPU process data without losing samples?",
   null,
   [
     "Use half-transfer interrupts and process the idle half",
     "Read the buffer at random times without any interrupts",
     "Stop the DMA each time the CPU needs the data",
     "Process the whole buffer only after the next reset"
   ],
   "Circular DMA keeps overwriting the buffer. Two interrupts per cycle mark which half is stable, so the CPU must finish processing one half within the time DMA fills the other half. That deadline must be part of the timing analysis."],
  ["A DMA transfer uses a peripheral data register as the source. Which address mode is correct?",
   null,
   [
     "The peripheral address is fixed and the memory one increments",
     "Both addresses increment together",
     "The peripheral address increments and the memory address stays fixed",
     "Both addresses stay fixed"
   ],
   "A peripheral's data register is always at the same address, so it must not increment, while the destination buffer advances each element. A wrong increment setting reads other registers or writes a single location."],
  ["Two bus masters (CPU and DMA) access the same SRAM bank at the same time. What is the effect on timing?",
   null,
   [
     "Arbitration delays one of them, so CPU time can grow",
     "None, because the buses are infinitely fast",
     "The CPU stops permanently until the DMA ends",
     "The DMA always has zero priority on the bus"
   ],
   "Shared memory or bus matrix slaves serialise accesses. WCET analysis must include DMA interference, or the memory must be partitioned (separate banks or tightly coupled memory). Check the device's bus matrix and arbitration settings."],
  ["What is the purpose of memory-protection regions marked 'execute never' (XN) for data memory?",
   null,
   [
     "It stops a corrupted pointer being executed as code",
     "It makes the data faster to read from the bus",
     "It removes the need for a stack in the region",
     "It enables DMA access to the region"
   ],
   "Separating code and data permissions makes unintended execution a detectable fault. MPUs on Cortex-M support execute-never attributes per region."]
]);
window.QUIZ_ADD("mcu", [
  ["A write-back data cache covers a DMA receive buffer that is not aligned to the cache-line size. After invalidating the buffer's address range, a neighbouring variable sometimes loses its value. Why?",
   null,
   [
     "Invalidate works on whole lines, so a dirty neighbour is lost",
     "Invalidate also erases the flash behind the cache",
     "The neighbour variable is always declared `volatile`",
     "The DMA writes to the neighbour variable on purpose"
   ],
   "Cache maintenance works on lines (commonly 32 bytes on Cortex-M7, but check the device). Invalidating a line that holds both buffer bytes and a CPU-written variable throws away unwritten data. Place DMA buffers in line-aligned, line-multiple sizes or in a non-cacheable MPU region."],
  ["What is the difference between a 'clean' and an 'invalidate' operation on a data cache?",
   null,
   [
     "Clean writes dirty lines back; invalidate drops the cached copy",
     "Clean discards the lines, and invalidate writes them back",
     "They are the same operation under two different names",
     "Clean disables the cache, and invalidate enables it"
   ],
   "Before DMA reads memory the CPU data must be cleaned (written back). Before the CPU reads data that DMA wrote, the stale cached copy must be invalidated. Both operations are wrong if they cover lines that hold unrelated data."],
  ["What is the advantage of placing safety-critical interrupt handlers and their data in tightly-coupled memory (TCM) on devices that provide it?",
   null,
   [
     "Access time is short and fixed, so timing is predictable",
     "TCM is always larger than the flash memory",
     "TCM never needs any form of ECC",
     "TCM can only be used by the debugger"
   ],
   "TCM is directly connected to the core without caches or shared bus arbitration (device-dependent), so access time does not vary with cache state. That helps with WCET analysis. Check which masters, such as DMA, can reach it."],
  ["A single-bit error occurs in ECC-protected RAM. What does a typical SECDED scheme do?",
   null,
   [
     "It corrects it, and detects a double-bit error",
     "It ignores single-bit errors silently",
     "It always resets the MCU on any error",
     "It corrects both single and double errors"
   ],
   "SECDED means single-error correction, double-error detection. Software should count corrected errors (a rising rate indicates a failing cell or an environment problem) and handle uncorrectable errors as safety-relevant faults."],
  ["What does a lockstep dual-core arrangement detect?",
   null,
   [
     "Random hardware faults such as a bit flip in one core",
     "Software logic errors in the application code",
     "Errors in the requirements of the system",
     "Bugs in the compiler that built the code"
   ],
   "Both cores run the same code, and a comparator flags any difference. It does not detect systematic software faults because both cores run the same wrong code. Many safety MCUs delay one core by a few cycles to improve common-cause coverage."],
  ["Why do some safety MCUs offer a built-in self-test (BIST) of logic and memory at start-up?",
   null,
   [
     "To find latent hardware faults before they matter",
     "To raise the clock speed after power-up",
     "To remove the need for a watchdog",
     "To replace all of the software testing"
   ],
   "Latent faults in rarely used logic or memory may sit unnoticed until needed. A BIST at start-up (and sometimes periodically) reduces that risk. The coverage claim comes from the device's safety manual, which software must follow."],
  ["The device's safety manual lists 'assumptions of use' for the software. How should you treat them?",
   null,
   [
     "As requirements on your software, to be verified",
     "As optional hints that can be skipped",
     "As marketing material for the device",
     "As documentation of the hardware only"
   ],
   "Safety claims about the hardware hold only if the stated conditions are met. Each assumption should trace to a requirement, a design element, and a verification result."],
  ["A GPIO output drives an LED directly through a resistor, and it is also used as an input at times. What is the main risk at start-up?",
   null,
   [
     "Pins are high-impedance after reset, so the state is undefined",
     "The LED is always on after reset",
     "GPIO pins cannot be configured as inputs",
     "The resistor burns out at power-up"
   ],
   "Most MCUs reset I/O pins to a high-impedance state. External circuits (pull-ups or pull-downs) must give a safe default for outputs that control hardware, because software has not run yet."],
  ["What happens to a pending interrupt flag if the interrupt source is cleared at the peripheral but the NVIC pending bit is not?",
   null,
   [
     "It can run once more, since the NVIC pending bit is separate",
     "The interrupt can never run again",
     "The core resets at once",
     "The pending bit clears itself immediately in every case"
   ],
   "There are two stages: the peripheral status flag and the interrupt controller's pending state. A flag cleared after the NVIC latched the request can lead to a spurious handler execution. Handlers must tolerate this, or clear the pending bit explicitly (with care)."],
  ["Which statement about interrupt handler design is the best practice for real-time systems?",
   null,
   [
     "Keep it short: capture, clear the source, defer the rest",
     "Run all of the processing inside the handler",
     "Call blocking APIs inside the handler",
     "Allocate memory inside the handler"
   ],
   "Long handlers increase latency for other interrupts and make timing analysis harder. Deferred processing through a flag, queue or semaphore keeps ISR execution time bounded and small."],
  ["A level-triggered interrupt line stays asserted after the handler returns without clearing the source. What happens?",
   null,
   [
     "It re-enters repeatedly and starves lower priorities",
     "It is masked automatically for ever",
     "The CPU enters sleep mode",
     "Nothing, because it needs an edge to fire again"
   ],
   "A level-sensitive source keeps the request active until the cause is cleared. The handler must clear the source (and wait for the clear to take effect on buffered buses, see the module's note on the write buffer)."],
  ["What is the benefit of a hardware FIFO on a UART or SPI peripheral for a system with strict interrupt latency?",
   null,
   [
     "It lets the CPU handle several bytes per interrupt",
     "It stops the baud rate from drifting",
     "It encrypts the data in the FIFO",
     "It increases the number of GPIO pins"
   ],
   "A FIFO tolerates delay in the interrupt response because bytes queue up. The FIFO depth and the trigger threshold set the available time, which should be checked against the worst-case interrupt latency."],
  ["What is the typical cause of a peripheral not working after the code writes its registers, when the same code works for another peripheral?",
   null,
   [
     "The peripheral clock is not enabled, or it is held in reset",
     "The compiler removed the register from the build",
     "The peripheral requires a 64-bit address",
     "The stack is too small for the register writes"
   ],
   "On many MCUs peripherals are clock-gated for power saving, and writes to gated peripherals are ignored or read back as zero. Enable the clock (and release the reset), then wait the documented delay if one is specified."],
  ["After enabling the clock of a peripheral, a read of its register right away sometimes returns old data. What do some reference manuals recommend?",
   null,
   [
     "Insert a short delay or a read-back and barrier",
     "Disable the clock again immediately after enabling it",
     "Use a bigger stack for the register access",
     "Reset the CPU after every clock change"
   ],
   "Some devices need one or more cycles before the peripheral responds after clock gating changes. Follow the vendor's guidance, which may appear in errata or application notes. Verify on the actual silicon revision."],
  ["Why does a bit-band alias (where available) allow single-instruction atomic bit set or clear on some Cortex-M cores?",
   null,
   [
     "A word write becomes an atomic one-bit update",
     "It disables interrupts for the duration of the write",
     "It copies the bit to flash first",
     "It creates a mutex around the access"
   ],
   "Bit-banding on Cortex-M3/M4 maps each bit of certain regions to a word address, so a plain store changes just that bit atomically. It is not available on all cores (for example it is not part of Cortex-M0 or M7 as standard), so portable code should use the device's atomic set/clear registers instead."],
  ["What is the safest way to update one bit of a memory-mapped output data register that has no separate set/clear registers, when an ISR also modifies other bits?",
   null,
   [
     "Protect the read-modify-write with a short critical section",
     "Use `|=` and hope that no interrupt occurs",
     "Disable compiler optimisation and nothing else",
     "Copy the register to a `static` variable and write it back later"
   ],
   "Without atomic set/clear support the sequence read, modify, write can be interrupted, and the ISR's change is lost when main writes back. Many MCUs provide BSRR-style set/reset registers for this reason."],
  ["Which of the following is a typical symptom of stack overflow into adjacent RAM variables?",
   null,
   [
     "Random corruption or crashes that vary with call depth",
     "A compile error at link time",
     "Faster execution of the affected code",
     "A larger flash image after the build"
   ],
   "A stack growing into data does not fail where it overflows, but corrupts memory elsewhere. Place the stack at the lowest address, or add a guard region, and use static analysis and a fill pattern to check margins."],
  ["How does a sleep mode (WFI) commonly reduce power in an MCU?",
   null,
   [
     "The core clock stops until an interrupt arrives",
     "The flash is erased to save current",
     "The ADC calibrates itself while the core sleeps",
     "The compiler removes the unused code"
   ],
   "`WFI` suspends the core until an enabled interrupt (or debug event) occurs. Deeper modes also stop or gate more clocks and regulators, which increases wake-up time, so the latency requirements must be checked."],
  ["Why can a system fail to wake from deep sleep reliably if the wake-up interrupt source clock is gated off?",
   null,
   [
     "The wake-up logic needs a running clock domain",
     "Deep sleep always disables every wake-up source",
     "The CPU does not support interrupts in deep sleep",
     "The flash is unreadable after waking"
   ],
   "Each low-power mode keeps certain domains alive. Only wake-up sources in those domains (for example an external pin or a low-power timer) can end the mode. Test every wake-up path in the low-power configuration actually shipped."],
  ["What is a typical risk of using a floating-point unit (FPU) in an ISR on Cortex-M4F with lazy stacking?",
   null,
   [
     "It adds stacking time and may corrupt FPU registers",
     "The FPU cannot run in an ISR at all",
     "FPU registers are always saved in flash",
     "FPU use always lowers the interrupt priority"
   ],
   "Entry to a handler that uses the FPU may stack the floating-point registers, increasing latency and stack use. RTOS ports need to follow their rules for FPU context handling per task and per ISR."],
  ["An MCU has no hardware divider. What does `a / b` for 32-bit integers compile to?",
   null,
   [
     "A library routine whose time varies with the operands",
     "A single instruction taking exactly one cycle",
     "A compile-time constant for every operand",
     "A lookup in a table stored in flash"
   ],
   "Division can be slow and data-dependent on cores without a fast divider, so use shifts for powers of two, reciprocals where valid, or avoid division in time-critical paths. The WCET analysis must use the maximum cost."]
]);
window.QUIZ_ADD("mcu", [
  ["Which action does the bootloader or start-up code have to do when the application's vector table is not at address 0?",
   null,
   [
     "Set the vector table offset register to the application's table",
     "Nothing, because the CPU always finds the table",
     "Disable the NVIC permanently while the table moves",
     "Copy the table into flash at every start"
   ],
   "Cortex-M3 and later have a vector-table offset register. If it still points to the bootloader's table, interrupts run the wrong handlers. Cores without that register (for example some Cortex-M0 devices) need a remap feature or a RAM copy, so check the device."],
  ["What does the MPU on a Cortex-M typically do when unprivileged code accesses a region it has no permission for?",
   null,
   [
     "It raises a MemManage fault, or HardFault",
     "It silently ignores the write",
     "It resets the debugger interface",
     "It increases the stack size of the task"
   ],
   "The MPU enforces access permissions per region. A violation raises a memory management fault, giving fault containment between tasks, which is a basis for partitioning arguments. Region count, alignment and size rules are core-specific."],
  ["Why is it important to enable the divide-by-zero and unaligned-access traps (where the core supports them) during development and test of safety software?",
   null,
   [
     "They turn latent defects into detectable faults",
     "They speed up the program on the target",
     "They reduce the flash usage of the code",
     "They remove the need for testing"
   ],
   "By default, divide by zero on some Cortex-M cores returns 0 without a fault. A trap makes the defect visible. The production configuration (trap or defined handling) should be specified by the requirements, and tests should cover the handler."],
  ["What does 'read-out protection' (RDP) or a similar flash-protection feature mainly protect?",
   null,
   [
     "It blocks reading of the firmware through the debug port",
     "It protects against power failure during a write",
     "It protects against compiler errors in the code",
     "It protects against stack overflow in tasks"
   ],
   "Protection levels restrict debug and programming access. They can also make field failure analysis harder (some levels erase flash when lowered), so the lifecycle process for returns must be planned. Details are device-specific."],
  ["What is the main function of a DMA error interrupt, and how should software respond?",
   null,
   [
     "It signals a transfer error: stop, discard and report",
     "It signals successful completion of the transfer",
     "It speeds up the transfer by retrying",
     "It disables the peripheral permanently without notice"
   ],
   "A transfer error means the buffer content cannot be trusted. Ignoring it passes corrupt data on. Test the path by injecting an error, for example by using an invalid address in a test build."],
  ["Which approach ensures a configuration register is not accidentally changed after initialisation?",
   null,
   [
     "Use hardware locks and verify the contents periodically",
     "Never read the register again after the initial write",
     "Place the register in the heap",
     "Mark the register `static` in the driver"
   ],
   "Single-event upsets and software errors can alter configuration registers. Locks and periodic read-back checks (a typical safety-mechanism requirement) detect or prevent the change."],
  ["What does 'errata' mean for an MCU, and what must a project do with it?",
   null,
   [
     "A vendor list of silicon defects and workarounds",
     "A marketing brochure for the device",
     "A list of the compiler options to use",
     "A tool for debugging the target"
   ],
   "Hardware errata can change software requirements (for example a specific access sequence). Track them against the silicon revision actually fitted, and record the decision for each applicable one."],
  ["A 12-bit ADC result is read as 0xFFF constantly although the input is mid-scale. Which cause is most plausible?",
   null,
   [
     "The input is clipping, or the channel or pin mode is wrong",
     "The ADC has too high a resolution for the input",
     "The stack is too large for the conversion",
     "SPI is disabled on the device"
   ],
   "A saturated reading points to a hardware or configuration cause such as wrong channel, pin left in digital mode, input outside the range, or a missing reference. Use known test inputs (ground, reference) to separate the causes."],
  ["Why is ADC self-calibration recommended after power-up or large temperature changes on many MCUs?",
   null,
   [
     "It reduces offset and gain errors that drift",
     "It increases the number of ADC channels",
     "It encrypts the conversion results",
     "It changes the sampling frequency"
   ],
   "Calibration compensates for internal offset or linearity errors. Whether it is needed and how it is done is device-specific, and the accuracy budget must include any residual error."],
  ["What is the main reason for a decoupling capacitor close to each MCU supply pin?",
   null,
   [
     "To supply fast transient currents at clock edges",
     "To store program code for the core",
     "To raise the clock frequency of the core",
     "To enlarge the flash memory"
   ],
   "Switching currents cause supply dips if the loop inductance is high. Bypass capacitors provide a local charge reservoir. Poor decoupling shows up as random resets, ADC noise or intermittent faults that software cannot fix."],
  ["A 3.3 V MCU input is connected to a 5 V sensor output. What must be verified?",
   null,
   [
     "Whether the pin is 5 V tolerant in that mode",
     "Nothing, because all pins are 5 V tolerant",
     "Only the software baud rate",
     "Only the flash size"
   ],
   "Input absolute maximum ratings are in the datasheet, and 5 V tolerance is pin- and mode-dependent (for example analogue mode is not tolerant). Violating it can cause latch-up or permanent damage and is a hardware design issue to resolve before software work."],
  ["What is the typical goal of enabling the independent (separate-oscillator) watchdog instead of a watchdog clocked from the system clock?",
   null,
   [
     "It keeps running even if the main clock fails",
     "It is more accurate than the main watchdog",
     "It never needs to be refreshed",
     "It also performs the ADC conversions"
   ],
   "A watchdog on its own low-speed oscillator does not stop when the main clock stops, so it covers clock failure too. Its timeout accuracy is lower, so the window or timeout needs margin for the oscillator tolerance."],
  ["Why is a timeout necessary whenever software polls a hardware status flag?",
   null,
   [
     "The flag may never be set, and the wait would hang",
     "Polling always completes within 1 microsecond",
     "Timeouts increase the flash size",
     "Without a timeout the compiler warns"
   ],
   "Every wait for an external event needs an upper bound with a defined error action. This also keeps WCET bounded. The timeout value comes from the requirement or hardware specification, plus margin."],
  ["A hardware timer interrupt fires every 1 ms and the handler occasionally takes 1.2 ms because of a rare path. What is the consequence?",
   null,
   [
     "Interrupts overrun and are missed or delayed",
     "Nothing, because the timer slows down automatically",
     "The compiler corrects the overrun at run time",
     "The handler is skipped for ever afterwards"
   ],
   "A handler must complete within its period, including preemption by other interrupts. Measure and bound its WCET, and detect overruns (for example by checking the pending flag at entry or a timestamp)."],
  ["What is a sensible use of the SysTick timer in a bare-metal design?",
   null,
   [
     "A periodic time base for scheduling and timeouts",
     "Running all of the application logic inside its handler",
     "Storing the program code",
     "Measuring the supply voltage"
   ],
   "SysTick is a simple core-integrated down-counter. Its handler should be short. The tick frequency, rollover and the effect of sleeping or clock changes on it must be understood."],
  ["Which statement about a real-time clock (RTC) and a backup domain is correct?",
   null,
   [
     "They can run from a battery, but accuracy drifts",
     "The RTC is always perfectly accurate",
     "The RTC needs no clock source",
     "The backup domain loses its data at every reset"
   ],
   "Low-power 32.768 kHz crystals drift with temperature and tolerance (tens of ppm typical, check the datasheet). Applications needing traceable time must synchronise periodically and handle battery loss."],
  ["What is the CRC hardware unit in an MCU typically used for?",
   null,
   [
     "Fast CRC over a memory range, such as a flash check",
     "Encrypting the data held in memory",
     "Measuring analogue values",
     "Generating PWM signals"
   ],
   "A hardware CRC speeds up integrity checks. The polynomial, initial value, bit and byte order and the input width may differ from the software or standard variant, so test against known vectors."],
  ["Why can the same CRC polynomial produce different results in a hardware unit and in a software library?",
   null,
   [
     "Initial value, reflection and final XOR are parameters too",
     "Polynomials change over time",
     "The hardware unit inverts data randomly",
     "CRC results depend on the compiler"
   ],
   "A CRC 'standard' is defined by polynomial, width, init, reflect-in, reflect-out and XOR-out. Matching only the polynomial gives a different result. Validate with the known check value (for example for the string \"123456789\") in the catalogue you use."],
  ["Which approach to reading a 16-bit timer value that is also written by an ISR avoids a torn read on an 8-bit MCU?",
   null,
   [
     "Use the temporary high-byte register, or a critical section",
     "Read the low byte first and ignore the high byte",
     "Read it twice without any checks",
     "Convert it to `float` before use"
   ],
   "On 8-bit AVR-style devices, a read of the low byte latches the high byte into a temporary register so both bytes are consistent, if the access order specified in the manual is followed. Otherwise disable interrupts around the read."],
  ["What does JTAG or SWD give a development team, and what is the safety concern in a delivered product?",
   null,
   [
     "Debug access; in the product it should be disabled",
     "A faster ADC for the target",
     "A way to raise the supply voltage",
     "A cryptographic key for the firmware"
   ],
   "Debug ports give full control over memory and registers. Fielded devices should lock them (or at least control access), according to the security and safety requirements. The lock process must also be part of the manufacturing and verification plan."],
  ["Why can a measured execution time of a function on a development board differ from the target product, even with the same MCU?",
   null,
   [
     "Clock, wait states, cache state and bus load change timing",
     "The compiler is different on different days",
     "Code runs slower in the laboratory",
     "Flash is faster in the product"
   ],
   "Timing depends on the whole configuration. Timing evidence must come from the final configuration (or be shown to bound it), and the conditions of the measurement should be recorded."],
  ["What is the most robust way to produce the 'pre-initialised before main()' state of a peripheral that controls safety-relevant outputs?",
   null,
   [
     "Hold the outputs safe in hardware, then enable the driver",
     "Rely on the random pin states after reset",
     "Initialise them after the application has started",
     "Skip the initialisation of the outputs"
   ],
   "Software only starts after reset, so the hardware default decides the output state until then. Design hardware so the default is safe, and enable the driver only after configuration."]
]);
window.QUIZ_ADD("mcu", [
  ["A control loop runs from a timer interrupt. The ADC is triggered by the same timer. What is the advantage of hardware-triggered sampling compared with starting the ADC from the ISR in software?",
   null,
   [
     "The sampling instant is fixed by hardware",
     "It makes the ADC more accurate by 4 bits",
     "It removes the need for a timer",
     "It disables interrupts during the conversion"
   ],
   "Software-started conversions inherit the interrupt latency jitter, which becomes phase error in a control loop or noise in a measurement. Timer-triggered conversion keeps the sample spacing constant."],
  ["An output pin must change state in the same instant as another pin of the same port. Which feature gives a simultaneous change?",
   null,
   [
     "A single port write updates several bits at the same edge",
     "Two separate writes in a row, because each takes zero time",
     "Two different timers, one for each pin",
     "Interrupts at equal priority"
   ],
   "A single bus write updates all bits of one port at the same clock edge. Two writes are separated by at least an instruction or bus cycle (and in a write-buffered system their timing is not guaranteed). If skew matters, use one write or a timer-driven output."]
]);
