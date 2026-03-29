from odoo import fields, models


class ProjectTaskType(models.Model):
    _inherit = 'project.task.type'
    _description = 'Project Task Stage'

    bakki_workflow_state = fields.Selection(
        selection=[
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('done', 'Done'),
            ('cancelled', 'Cancelled'),
        ],
        string='Bakki Workflow State',
        default='pending',
        required=True,
        index=True,
    )
