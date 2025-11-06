# tests/test_calculator.py
import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from calculator_app import Calculator

class TestCalculator:
    def setup_method(self):
        self.calc = Calculator()
    
    def test_basic_addition(self):
        assert self.calc.evaluate("2+2") == "4"
    
    def test_basic_subtraction(self):
        assert self.calc.evaluate("5-3") == "2"
    
    def test_basic_multiplication(self):
        assert self.calc.evaluate("3*4") == "12"
    
    def test_basic_division(self):
        assert self.calc.evaluate("8/2") == "4.0"
    
    def test_division_by_zero(self):
        assert "Division by zero" in self.calc.evaluate("5/0")
    
    def test_parentheses(self):
        assert self.calc.evaluate("(2+3)*4") == "20"
    
    def test_exponentiation(self):
        assert self.calc.evaluate("2^3") == "8"
    
    def test_complex_expression(self):
        assert self.calc.evaluate("(2+3)*(4+5)") == "45"
    
    def test_decimal_operations(self):
        assert self.calc.evaluate("2.5+3.5") == "6.0"
        assert self.calc.evaluate("10.5/2.5") == "4.2"
    
    def test_negative_results(self):
        assert self.calc.evaluate("5-10") == "-5"
        assert self.calc.evaluate("-10+5") == "-5"
    
    def test_large_numbers(self):
        result = self.calc.evaluate("1000*1000")
        assert result == "1000000"
    
    def test_zero_operations(self):
        assert self.calc.evaluate("0+5") == "5"
        assert self.calc.evaluate("5*0") == "0"
        assert self.calc.evaluate("0/5") == "0.0"
    
    def test_nested_parentheses(self):
        assert self.calc.evaluate("((2+3)*4)") == "20"
        assert self.calc.evaluate("(2+(3*4))") == "14"
    
    def test_mixed_operations(self):
        assert self.calc.evaluate("2+3*4") == "14"
        assert self.calc.evaluate("(2+3)*4") == "20"
    
    def test_exponent_order(self):
        assert self.calc.evaluate("2^3^2") == "512"  # 2^(3^2)
    
    def test_empty_expression(self):
        assert "Invalid" in self.calc.evaluate("")
        assert "Invalid" in self.calc.evaluate("   ")
    
    def test_only_operators(self):
        assert "Invalid" in self.calc.evaluate("+++")
        assert "Invalid" in self.calc.evaluate("---")
    
    def test_whitespace_handling(self):
        assert self.calc.evaluate("2 + 2") == "4"
        assert self.calc.evaluate("2+2") == "4"
        assert self.calc.evaluate(" 2 + 2 ") == "4"

    def test_invalid_expression(self):
        assert "Invalid" in self.calc.evaluate("2++3")
        assert "Invalid" in self.calc.evaluate("2+")
    
    def test_unbalanced_parentheses(self):
        assert "Invalid" in self.calc.evaluate("(2+3")
        assert "Invalid" in self.calc.evaluate("2+3)")
    
    def test_negative_numbers(self):
        assert self.calc.evaluate("-5+3") == "-2"
        assert self.calc.evaluate("5+-3") == "2"
