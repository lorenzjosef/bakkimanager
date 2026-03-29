from odoo import fields, models


class BakkiPlantingPhase(models.Model):
    _name = 'bakki.planting_phase'
    _description = 'Bakki planting phase'
    _order = 'start_date desc, name'

    name = fields.Char(string='Phase Name', required=True, index=True)
    ranch_id = fields.Many2one('bakki.ranch', string='Ranch', ondelete='set null', index=True)
    start_date = fields.Date(string='Start Date', index=True)
    end_date = fields.Date(string='End Date', index=True)
    field_lead_profile_id = fields.Many2one(
        'bakki.user_profile',
        string='Field Lead',
        ondelete='set null',
        index=True,
    )
    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('active', 'Active'),
            ('done', 'Done'),
            ('cancelled', 'Cancelled'),
        ],
        string='State',
        default='draft',
        required=True,
        index=True,
    )
    crew_rotation = fields.Char(string='Crew Rotation')
    operational_notes = fields.Text(string='Operational Notes')
    description = fields.Text(string='Description')
    default_task_type = fields.Selection(
        selection=[
            ('planting', 'Planting'),
            ('monitoring', 'Monitoring'),
            ('fertilizing', 'Fertilizing'),
        ],
        string='Default Task Type',
        default='planting',
    )
    active = fields.Boolean(string='Active', default=True)
