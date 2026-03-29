from odoo import fields, models


class BakkiAreaObservation(models.Model):
    _name = 'bakki.area_observation'
    _description = 'Bakki area observation'
    _order = 'observed_at desc, id desc'

    area_id = fields.Many2one('bakki.area', string='Area', required=True, ondelete='cascade', index=True)
    phase_id = fields.Many2one('bakki.planting_phase', string='Planting Phase', ondelete='set null', index=True)
    author_user_id = fields.Many2one('res.users', string='Author', required=True, ondelete='restrict', index=True)
    observed_at = fields.Datetime(string='Observed At', default=fields.Datetime.now, required=True, index=True)
    measured_height_m = fields.Float(string='Measured Height (m)')
    measured_tree_count = fields.Integer(string='Measured Tree Count')
    measured_density_per_100sqm = fields.Float(string='Measured Density per 100 sqm')
    survival_per_100sqm = fields.Float(string='Survival per 100 sqm')
    notes = fields.Text(string='Notes')
