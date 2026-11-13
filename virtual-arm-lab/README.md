# Virtual ARM Lab

A virtual ARM VxWorks emulator in a single-file web app: a virtual Cortex-M3 style MCU with an IDE and debugger (breakpoints, watchpoints, registers, watch, locals, memory, disassembly, call stack, peripherals, tasks) and a live board with LEDs, buttons, a buzzer, a potentiometer on a 12-bit ADC, a hardware watchdog, a UART terminal, an I²C temperature sensor and EEPROM, and an SPI shift register.

## Use it

Download `index.html` and open it in a browser. Nothing to install; it works offline.

Pick a file (or **Open an example…**), press **Build**, then **Run** or step (F10 over, F11 into, Shift+F11 out, F9 breakpoint).

## Built-in documentation

Press **Manual** in the toolbar (or F1):

- **User Manual:** projects and files, creating a program (C, assembly, several files, VxWorks), building, running, debugging, testing, shortcuts and troubleshooting. Code examples have an **Add to project** button.
- **Datasheet:** CPU registers, memory map, every peripheral register, the exception and interrupt architecture, the instruction set and the C compiler.
- **VxWorks API Reference:** every kernel function with its errors, scheduling, errno values and the differences from a real VxWorks system.

## What is inside

- **CPU:** ARMv7-M instruction subset with Cortex-M exception handling (stacked frames, EXC_RETURN, MSP/PSP, PendSV, SysTick), interrupt priorities with nesting (NVIC and SCB priority registers, BASEPRI), 64 KB RAM, 1 MHz virtual clock.
- **C compiler:** a C subset with structs, unions, enums, multi-dimensional arrays, recursion, function pointers, typedef, switch, variadic functions, `++` and assignment inside expressions, a preprocessor with function-like macros and `#if`/`#ifdef`, and linking with assembly files.
- **Linker file and startup code:** a C program can be laid out by a GNU ld-style linker file (`.text`, `.rodata`, `.data` loaded from flash, `.bss`, stack, symbols such as `_sdata` and `_ebss`) with its own `startup.s` with a real vector table at 0x08000000 (SP and `Reset_Handler` loaded at reset, one entry per exception and device interrupt, weak handlers that fall back to `Default_Handler`) that sets the stack, copies `.data` and zeroes `.bss`; Build shows the memory map. Example: `linker/`; `blink.c`, `irq.c` and the interface samples in `samples/` are built the same way (`app.ld` + `startup.s` in their folder), and so is every VxWorks program (`vxworks/vxWorks.ld`, whose `startup.s` sets up RAM before the kernel starts).
- **Debugger extras:** a Map tab that draws flash and RAM (vector table, code, data, heap, stacks) with live stack-pointer markers, and Out of loop stepping (Ctrl+Shift+F10).
- **Share links:** the link button packs the program in the editor into a link (after `#`, never sent to a server); whoever opens it is asked before its files are added.
- **VxWorks 7 style kernel:** tasks (with `taskRestart`), semaphores, message queues, events, watchdogs, a heap with `malloc`/`free`, system clock and interrupts, with demos and a self-test of every API.
- **Bare metal or VxWorks:** bare-metal programs use register names at fixed addresses; VxWorks programs are configured by a device tree (`board.dts`, compiled to a standard DTB at Build) and use drivers, as on a real VxWorks system (much simplified; not VxBus).

The VxWorks part is an independent teaching implementation of the public API. It is not Wind River code and is not affiliated with Wind River.

## Author and license

Copyright (C) 2026 Gopu Sugumar. Licensed under the GNU General Public License, version 3 or (at your option) any later version (`GPL-3.0-or-later`). See [`LICENSE`](LICENSE). Anyone who distributes this program or a modified version must release it under the same license, with its source.
