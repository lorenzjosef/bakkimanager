from odoo import fields, models


class ProjectTask(models.Model):
    _inherit = 'project.task'
    _description = 'Project Task'

    bakki_template_id = fields.Many2one('bakki.task_template', string='Bakki Template', ondelete='set null', index=True)
    bakki_area_id = fields.Many2one('bakki.area', string='Bakki Area', ondelete='set null', index=True)
    bakki_phase_id = fields.Many2one('bakki.planting_phase', string='Bakki Phase', ondelete='set null', index=True)
    bakki_task_type = fields.Selection(
        selection=[
            ('planting', 'Planting'),
            ('monitoring', 'Monitoring'),
            ('fertilizing', 'Fertilizing'),
        ],
        string='Bakki Task Type',
        index=True,
    )
    bakki_youtube_url = fields.Char(string='Bakki YouTube URL')
    bakki_checklist_state = fields.Json(string='Bakki Checklist State')
    bakki_geometry_snapshot = fields.Text(
        string='Bakki Geometry Snapshot',
        help='Legacy geometry snapshot scaffold retained while Bakki Core PostGIS owns authoritative geometry.',
    )
    bakki_monitoring_density_per_100sqm = fields.Float(string='Monitoring Density per 100 sqm')
    bakki_monitoring_tree_count = fields.Integer(string='Monitoring Tree Count')
    bakki_workflow_state = fields.Selection(
        related='stage_id.bakki_workflow_state',
        string='Bakki Workflow State',
        store=True,
        readonly=True,
    )
