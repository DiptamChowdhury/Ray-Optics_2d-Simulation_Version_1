"""
Optics Lab - Convex Mirror Ray Tracing (Python Tkinter)
Requires NO extra pip installations (Uses standard Python library).
Runs as a desktop interactive GUI in pure black-and-white.
"""

import tkinter as tk
from tkinter import ttk
import math

class ConvexMirrorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Convex Mirror Light Experiment - Ray Tracing")
        self.root.geometry("1000 + 720")
        self.root.configure(bg="#ffffff")

        # Initial optical parameters
        self.pole_x = 520
        self.axis_y = 260
        self.u = 180.0       # Object distance (positive magnitude)
        self.h = 90.0        # Object height
        self.R = 260.0       # Radius of curvature
        self.mirror_h = 320.0# Aperture height

        # Toggles
        self.show_ray1 = tk.BooleanVar(value=True)
        self.show_ray2 = tk.BooleanVar(value=True)
        self.show_ray3 = tk.BooleanVar(value=True)
        self.show_labels = tk.BooleanVar(value=True)

        self._build_ui()
        self.render()

    def _build_ui(self):
        # Header
        header = tk.Frame(self.root, bg="#000000", pady=10)
        header.pack(fill="x")
        title = tk.Label(header, text="CONVEX MIRROR LIGHT EXPERIMENT", 
                         font=("Helvetica", 14, "bold"), fg="#ffffff", bg="#000000")
        title.pack()
        subtitle = tk.Label(header, text="Interactive Optics & Ray Tracing Simulator", 
                            font=("Helvetica", 9), fg="#cccccc", bg="#000000")
        subtitle.pack()

        # Canvas for Black on White Optics
        self.canvas = tk.Canvas(self.root, bg="#ffffff", width=960, height=440, 
                                highlightthickness=2, highlightbackground="#000000")
        self.canvas.pack(pady=12, padx=16)

        # Mouse Drag Events on Canvas
        self.canvas.bind("<B1-Motion>", self._on_canvas_drag)

        # Controls & Info Frame
        control_frame = tk.Frame(self.root, bg="#ffffff", padx=16, pady=4)
        control_frame.pack(fill="both", expand=True)

        # Sliders Column
        slider_col = tk.Frame(control_frame, bg="#ffffff")
        slider_col.pack(side="left", fill="both", expand=True, padx=(0, 20))

        # Slider 1: Object Distance (u)
        self.lbl_u = tk.Label(slider_col, text="Object Distance (u): 180 cm", 
                              font=("Helvetica", 10, "bold"), bg="#ffffff", anchor="w")
        self.lbl_u.pack(fill="x")
        self.scale_u = tk.Scale(slider_col, from_=40, to=400, orient="horizontal", 
                                bg="#ffffff", highlightthickness=0, command=self._on_slider_change)
        self.scale_u.set(180)
        self.scale_u.pack(fill="x", pady=(0, 6))

        # Slider 2: Object Height (h)
        self.lbl_h = tk.Label(slider_col, text="Object Height (h): 90 cm", 
                              font=("Helvetica", 10, "bold"), bg="#ffffff", anchor="w")
        self.lbl_h.pack(fill="x")
        self.scale_h = tk.Scale(slider_col, from_=30, to=150, orient="horizontal", 
                                bg="#ffffff", highlightthickness=0, command=self._on_slider_change)
        self.scale_h.set(90)
        self.scale_h.pack(fill="x", pady=(0, 6))

        # Slider 3: Curvature Radius (R)
        self.lbl_r = tk.Label(slider_col, text="Radius of Curvature (R): 260 cm", 
                              font=("Helvetica", 10, "bold"), bg="#ffffff", anchor="w")
        self.lbl_r.pack(fill="x")
        self.scale_r = tk.Scale(slider_col, from_=140, to=380, orient="horizontal", 
                                bg="#ffffff", highlightthickness=0, command=self._on_slider_change)
        self.scale_r.set(260)
        self.scale_r.pack(fill="x")

        # Toggles Row
        chk_row = tk.Frame(slider_col, bg="#ffffff")
        chk_row.pack(fill="x", pady=8)
        tk.Checkbutton(chk_row, text="Ray 1 (Parallel)", variable=self.show_ray1, 
                       bg="#ffffff", command=self.render).pack(side="left", padx=4)
        tk.Checkbutton(chk_row, text="Ray 2 (Center C)", variable=self.show_ray2, 
                       bg="#ffffff", command=self.render).pack(side="left", padx=4)
        tk.Checkbutton(chk_row, text="Ray 3 (Pole P)", variable=self.show_ray3, 
                       bg="#ffffff", command=self.render).pack(side="left", padx=4)

        # Right Column: Optical Physics Metrics
        info_col = tk.LabelFrame(control_frame, text=" OPTICAL CALCULATIONS ", 
                                 font=("Helvetica", 10, "bold"), bg="#ffffff", padx=12, pady=8)
        info_col.pack(side="right", fill="both", expand=True)

        self.txt_calc = tk.Label(info_col, text="", justify="left", 
                                 font=("Consolas", 10), bg="#ffffff", anchor="w")
        self.txt_calc.pack(fill="both", expand=True)

    def _on_slider_change(self, _=None):
        self.u = float(self.scale_u.get())
        self.h = float(self.scale_h.get())
        self.R = float(self.scale_r.get())
        self.lbl_u.config(text=f"Object Distance (u): {int(self.u)} cm")
        self.lbl_h.config(text=f"Object Height (h): {int(self.h)} cm")
        self.lbl_r.config(text=f"Radius of Curvature (R): {int(self.R)} cm")
        self.render()

    def _on_canvas_drag(self, event):
        # Allow dragging the object with the mouse directly on canvas
        obj_x = self.pole_x - self.u
        if abs(event.x - obj_x) < 40:
            new_u = max(40, min(400, self.pole_x - event.x))
            self.scale_u.set(int(new_u))
            if event.y < self.axis_y:
                new_h = max(30, min(150, self.axis_y - event.y))
                self.scale_h.set(int(new_h))

    def render(self):
        self.canvas.delete("all")

        # Calculations
        f = self.R / 2.0
        # Sign convention: 1/v = 1/f - 1/u => v = (f * u) / (f + u)
        v = (f * self.u) / (f + self.u)
        m = v / self.u
        h_img = m * self.h

        # Update metrics box
        metrics_text = (
            f"Focal Length (f = R/2) : +{f:.1f} cm\n"
            f"Object Distance (u)    : -{self.u:.1f} cm\n"
            f"Image Distance (v)     : +{v:.1f} cm (Behind mirror)\n"
            f"Magnification (m)      : +{m:.2f} (Erect)\n"
            f"Image Height (h')      : +{h_img:.1f} cm (Diminished)\n"
            f"-----------------------------------------\n"
            f"Nature: VIRTUAL, ERECT, DIMINISHED"
        )
        self.txt_calc.config(text=metrics_text)

        # 1. Principal Axis (Dashed horizontal line)
        self.canvas.create_line(40, self.axis_y, 920, self.axis_y, 
                                fill="#000000", width=1.5, dash=(6, 4))
        self.canvas.create_text(50, self.axis_y - 12, text="Principal Axis", 
                                font=("Helvetica", 9, "italic"), fill="#000000", anchor="w")

        # 2. Convex Mirror Arc
        # Center of curvature C
        C_x = self.pole_x + self.R
        C_y = self.axis_y
        F_x = self.pole_x + f

        # Mirror arc drawing
        half_h = self.mirror_h / 2.0
        dx = math.sqrt(max(1.0, self.R**2 - half_h**2))
        end_x = C_x - dx
        top_y = self.axis_y - half_h
        bot_y = self.axis_y + half_h

        # Draw smooth arc using small line segments
        steps = 40
        prev_pt = None
        for i in range(steps + 1):
            y = top_y + (self.mirror_h * i / steps)
            dy = y - self.axis_y
            x = C_x - math.sqrt(max(1.0, self.R**2 - dy**2))
            if prev_pt:
                self.canvas.create_line(prev_pt[0], prev_pt[1], x, y, fill="#000000", width=5)
                # Hatching tick on the concave side
                if i % 2 == 0:
                    angle = math.atan2(dy, C_x - x)
                    hx = x + math.cos(angle + 0.6) * 10
                    hy = y - math.sin(angle + 0.6) * 10
                    self.canvas.create_line(x, y, hx, hy, fill="#000000", width=1.2)
            prev_pt = (x, y)

        # Labels for P, F, C
        if self.show_labels.get():
            self.canvas.create_oval(self.pole_x - 3, self.axis_y - 3, self.pole_x + 3, self.axis_y + 3, fill="#000000")
            self.canvas.create_text(self.pole_x - 14, self.axis_y + 14, text="P", font=("Helvetica", 11, "bold"))

            self.canvas.create_oval(F_x - 3, self.axis_y - 3, F_x + 3, self.axis_y + 3, fill="#000000")
            self.canvas.create_text(F_x, self.axis_y + 16, text="F", font=("Helvetica", 11, "bold"))

            self.canvas.create_oval(C_x - 3, self.axis_y - 3, C_x + 3, self.axis_y + 3, fill="#000000")
            self.canvas.create_text(C_x, self.axis_y + 16, text="C", font=("Helvetica", 11, "bold"))

        # 3. Object Arrow (Solid black)
        obj_x = self.pole_x - self.u
        obj_tip_y = self.axis_y - self.h
        self.canvas.create_line(obj_x, self.axis_y, obj_x, obj_tip_y, fill="#000000", width=3, arrow=tk.LAST)
        self.canvas.create_text(obj_x, obj_tip_y - 14, text=f"Object\nh={int(self.h)}", 
                                font=("Helvetica", 9, "bold"), fill="#000000")

        # 4. Virtual Image Arrow (Dashed black)
        img_x = self.pole_x + v
        img_tip_y = self.axis_y - h_img
        self.canvas.create_line(img_x, self.axis_y, img_x, img_tip_y, fill="#000000", width=2.5, 
                                dash=(4, 3), arrow=tk.LAST)
        self.canvas.create_text(img_x + 35, img_tip_y - 4, text=f"Image\nh'={h_img:.1f}", 
                                font=("Helvetica", 9, "bold"), fill="#000000")

        # 5. Ray Tracing
        # Ray 1: Parallel to axis -> Reflects diverging away from F
        if self.show_ray1.get():
            hit1_y = obj_tip_y
            hit1_x = C_x - math.sqrt(max(1.0, self.R**2 - (hit1_y - self.axis_y)**2))
            
            # Incident
            self.canvas.create_line(obj_x, hit1_y, hit1_x, hit1_y, fill="#000000", width=2, arrow=tk.LAST)
            
            # Reflected
            dir_x = hit1_x - F_x
            dir_y = hit1_y - self.axis_y
            norm = math.hypot(dir_x, dir_y)
            refl1_end_x = hit1_x + (dir_x / norm) * 180
            refl1_end_y = hit1_y + (dir_y / norm) * 180
            self.canvas.create_line(hit1_x, hit1_y, refl1_end_x, refl1_end_y, fill="#000000", width=2, arrow=tk.LAST)
            
            # Virtual trace back to F
            self.canvas.create_line(hit1_x, hit1_y, F_x, self.axis_y, fill="#000000", width=1.2, dash=(4, 4))

        # Ray 2: Directed towards C -> Reflects back along same line
        if self.show_ray2.get():
            d2x = C_x - obj_x
            d2y = C_y - obj_tip_y
            len2 = math.hypot(d2x, d2y)
            hit2_x = C_x - (d2x / len2) * self.R
            hit2_y = C_y - (d2y / len2) * self.R

            # Incident & Reflected
            self.canvas.create_line(obj_x, obj_tip_y, hit2_x, hit2_y, fill="#000000", width=2, arrow=tk.BOTH)
            # Virtual trace to C
            self.canvas.create_line(hit2_x, hit2_y, C_x, C_y, fill="#000000", width=1.2, dash=(4, 4))

        # Ray 3: Directed to Pole P
        if self.show_ray3.get():
            self.canvas.create_line(obj_x, obj_tip_y, self.pole_x, self.axis_y, fill="#000000", width=1.5, arrow=tk.LAST)
            # Symmetrical reflected ray
            dx3 = self.pole_x - obj_x
            refl3_x = self.pole_x - dx3
            refl3_y = self.axis_y + self.h
            self.canvas.create_line(self.pole_x, self.axis_y, refl3_x, refl3_y, fill="#000000", width=1.5, arrow=tk.LAST)
            # Virtual backward trace to image
            self.canvas.create_line(self.pole_x, self.axis_y, img_x, img_tip_y, fill="#000000", width=1.2, dash=(4, 4))

if __name__ == "__main__":
    root = tk.Tk()
    app = ConvexMirrorApp(root)
    root.mainloop()
