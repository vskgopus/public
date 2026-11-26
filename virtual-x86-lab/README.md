# Virtual x86 Lab

A small 32-bit x86 board in a single-file web app: an editor, an Intel-syntax assembler that writes real IA-32 machine code, a C compiler (its output is translated to IA-32), a debugger (breakpoints, watchpoints, registers, memory, disassembly), a serial terminal and a simple PC-style BIOS with ACPI tables. It shares its source with [Virtual ARM Lab](../virtual-arm-lab/), which has the Arm boards.

## Use it

Open https://vskgopus.github.io/public/virtual-x86-lab/, or download `index.html` and open it in a browser. Nothing to install; it works offline.

Pick `x86/hello.s` (or **Open an example...**), press **Build**, then **Run** or step (F10 over, F11 into, Shift+F11 out, F9 breakpoint). The **Terminal** tab shows the serial port.

## Built-in documentation

Press **Manual** in the toolbar (or F1): a **User Manual** (projects and files, writing assembly or C, building, running, debugging) and a **Datasheet** (the board: instructions, memory map and I/O ports, the ACPI tables, C programs, every peripheral register).

## What is inside

- **CPU:** a 32-bit protected-mode x86 subset with a flat memory model (no paging, segments or interrupts), 1 instruction = 1 microsecond.
- **Board:** a serial port, the ACPI power-management block, and the ACPI tables (RSDP, XSDT, FADT, MADT, DSDT) in a BIOS window, changeable with the project file `x86/acpi.cfg`; the Cortex board's LEDs, buttons, ADC, UART, watchdog and other peripherals at 0x40010000.
- **Examples:** `x86/hello.s`, `x86/acpi.s` (finds and walks the ACPI tables, then powers off), `x86/hello.c`, `x86/gpio.c`, `x86/adc.c`, `x86/led.s`.

The table layouts, port addresses and the C calling convention are this emulator's own and have not been checked against the Intel or ACPI documents. It is not an exact or cycle-accurate model of any processor.

## Licence

GPL-3.0-or-later, see `LICENSE`. Copyright (C) 2026 Gopu Sugumar.
