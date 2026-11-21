# Virtual ARM Lab

A virtual ARM VxWorks emulator in a single-file web app: a virtual Cortex-M3, Cortex-M33, Cortex-M7 or Cortex-A55 style CPU (one or two cores) with an IDE and debugger (breakpoints, watchpoints, registers, watch, locals, memory, disassembly, call stack, peripherals, tasks) and a live board with LEDs, buttons, a buzzer, a potentiometer on a 12-bit ADC, a hardware watchdog, a UART terminal, an I²C temperature sensor and EEPROM, and an SPI shift register.

## Use it

Download `index.html` and open it in a browser. Nothing to install; it works offline.

Pick a file (or **Open an example…**), press **Build**, then **Run** or step (F10 over, F11 into, Shift+F11 out, F9 breakpoint).

## Built-in documentation

Press **Manual** in the toolbar (or F1):

- **User Manual:** projects and files, creating a program (C, assembly, several files, VxWorks), building, running, debugging, testing, shortcuts and troubleshooting. Code examples have an **Add to project** button.
- **Datasheet:** CPU registers, memory map, every peripheral register, the exception and interrupt architecture, the instruction set and the C compiler.
- **VxWorks API Reference:** every kernel function with its errors, scheduling, errno values and the differences from a real VxWorks system.

## What is inside

- **Core choice:** the list in the Board panel chooses the Arm core; a program can choose its own with `#pragma core "cortex-m33"`, and VxWorks programs take it from `board.dts`. This version has the Cortex-M3 and the Cortex-M33 (ARMv8-M: DSP instructions with CMSIS-style C intrinsics, stack limit registers, the ARMv8-M MPU, a single-precision FPU that the compiler uses for `float`, and TrustZone with the SAU, SecureFault, `cmse_nonsecure_entry`/`cmse_nonsecure_call`, `<arm_cmse.h>` and two-image Secure/Non-secure projects; examples `samples/m33.c` and `trustzone/`), and the Cortex-M7 (ARMv7E-M: DSP, a double-precision FPU that the compiler uses for `double`, cache control registers, a 64 KB ITCM; example `samples/m7.c`), and the Cortex-A55 (ARMv8.2-A: an A64 assembler and interpreter, EL0/EL1 exceptions, the Generic Timer and a GIC; assembly or C (the compiler's output translated to A64); examples `a55/timer.s` and `a55/ctimer.c`).
- **Two cores:** a program names the program of a second core with `#pragma core1 "file"`; shared RAM and peripherals, a messaging unit between the cores, all-stop debugging with a core list in the debug pane; example `amp/` (Cortex-M33 + Cortex-M7, as in the i.MX 95). `SCB_CPUID` tells a program which core it runs on.
- **CPU:** ARMv7-M instruction subset with Cortex-M exception handling (stacked frames, EXC_RETURN, MSP/PSP, PendSV, SysTick), interrupt priorities with nesting (NVIC and SCB priority registers, BASEPRI), 64 KB RAM, 1 MHz virtual clock.
- **C compiler:** a C subset with structs, unions, enums, multi-dimensional arrays, recursion, function pointers, typedef, switch, variadic functions, `++` and assignment inside expressions, structs passed and returned by value, bit-fields, compound literals, anonymous members, `goto`, `_Bool`, `offsetof`, `_Static_assert`, `__attribute__((packed))`, a simple `__asm`, signed and unsigned arithmetic that follows the types, a preprocessor with function-like macros and `#if`/`#ifdef`, and linking with assembly files. The assembler has `.byte`, `.hword`, `.ascii`, `.asciz` and `.space`.
- **Linker file and startup code:** a C program can be laid out by a GNU ld-style linker file (`.text`, `.rodata`, `.data` loaded from flash, `.bss`, stack, symbols such as `_sdata` and `_ebss`) with its own `startup.s` with a real vector table at 0x08000000 (SP and `Reset_Handler` loaded at reset, one entry per exception and device interrupt, weak handlers that fall back to `Default_Handler`) that sets the stack, copies `.data` and zeroes `.bss`; Build shows the memory map. Example: `linker/`; `blink.c`, `irq.c` and the interface samples in `samples/` are built the same way (`app.ld` + `startup.s` in their folder), and so is every VxWorks program (`vxworks/vxWorks.ld`, whose `startup.s` sets up RAM before the kernel starts).
- **Debugger extras:** a Map tab that draws flash and RAM (vector table, code, data, heap, stacks) with live stack-pointer markers, and Out of loop stepping (Ctrl+Shift+F10).
- **Share links:** the link button packs the program in the editor into a link (after `#`, never sent to a server); whoever opens it is asked before its files are added.
- **VxWorks 7 style kernel:** a target shell (call functions by name, `i`, `ts`, `lkup` ..., and a C interpreter for declarations, functions and statements), tasks (with MPU stack guards and `taskRestart`), semaphores, message queues, events (also sent by semaphores and message queues), task info and show calls, watchdogs, a heap with `malloc`/`free`/`memalign`, memory partitions (`memPartCreate` and friends), task hooks, task variables, signals (`kill`, `sigaction`, `sigprocmask`, `sigsuspend`), reader/writer semaphores (`semRWCreate`), POSIX clocks and timers (`clock_gettime`, `nanosleep`, `timer_create`), system clock and interrupts, with demos and a self-test of every API.
- **Bare metal or VxWorks:** bare-metal programs use register names at fixed addresses; VxWorks programs are configured by a device tree (`board.dts`, compiled to a standard DTB at Build) and use drivers, as on a real VxWorks system (much simplified; not VxBus).

The VxWorks part is an independent teaching implementation of the public API. It is not Wind River code and is not affiliated with Wind River.

## Author and license

Copyright (C) 2026 Gopu Sugumar. Licensed under the GNU General Public License, version 3 or (at your option) any later version (`GPL-3.0-or-later`). See [`LICENSE`](LICENSE). Anyone who distributes this program or a modified version must release it under the same license, with its source.
